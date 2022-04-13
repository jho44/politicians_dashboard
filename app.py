from flask import Flask, send_from_directory
from flask_restful import Api
from flask_cors import CORS #comment this on deployment
from api.Server import Server

# import schedule
import time
import requests
import os
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import threading
from threading import Thread
import time
import aiohttp
import asyncio
import csv

load_dotenv()

app = Flask(__name__, static_url_path='', static_folder='frontend/build')
CORS(app) #comment this on deployment
api = Api(app)

@app.route('/', defaults={'path':''})
def serve(path):
    return send_from_directory(app.static_folder,'index.html')

api.add_resource(Server, '/flask')

######### Rehydrate dataset with Twitter API #########
# TODO: put in schedule func
bearer_token = os.getenv('BEARER_TOKEN')
oauth_bearer_token = os.getenv('OAUTH_BEARER_TOKEN')
search_url = 'https://api.twitter.com/2/tweets/search/all'
query_params = {
    'start_time': '2020-01-01T00:00:01Z',
    'end_time': '2020-11-26T23:59:59Z',
    'max_results': '500',
    'tweet.fields': 'id,text,author_id,created_at',
    'user.fields': 'username',
    'expansions': 'entities.mentions.username,referenced_tweets.id.author_id',
}

data_lock = threading.Lock()
likers_lock = threading.Lock()
data = []

# https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/Recent-Search/recent_search.py
def bearer_oauth(r, token):
    """
    Method required by bearer token authentication.
    """
    r.headers["Authorization"] = f"Bearer {token}"
    r.headers["User-Agent"] = "v2RecentSearchPython"
    return r

def save_to_csv():
    with open(r'boop.csv', 'a') as f:
        writer = csv.writer(f)

        for row in data:
            writer.writerow(row)

        data = []

def connect_to_endpoint(url, params, token):
    response = None
    while True:
        response = requests.get(url, auth=lambda r: bearer_oauth(r, token), params=params)
        if response.status_code == 429:
            print('waiting')
            save_to_csv()
            time.sleep(60 * 15) # wait 15 mins before trying again, to get around rate limit
            print('done waiting')
        elif response.status_code != 200:
            raise Exception(response.status_code, response.text)
        else:
            return response.json()

def response_status_200(response):
    if response.status == 429:
        print('waiting')
        save_to_csv()
        time.sleep(60 * 15) # wait 15 mins before trying again, to get around rate limit
        print('done waiting')
        return 0
    elif response.status != 200:
        raise Exception(response.status, response.text)
    else:
        return 1 # Done

def get_likers(users_set, tweet_id):
    likers = []
    query_params = {}
    # headers =  {'User-Agent': 'v2RecentSearchPython','Authorization': f"Bearer {oauth_bearer_token}"}
    # async with aiohttp.ClientSession() as session:
    # while True: # break when run out of pages of results to go through
    json_response = None
    while True: # keep trying same request till it returns 200 response
        # async with session.get(f'https://api.twitter.com/2/tweets/{tweet_id}/liking_users', headers=headers, params=query_params) as response:
        json_response = connect_to_endpoint(f'https://api.twitter.com/2/tweets/{tweet_id}/liking_users', query_params, oauth_bearer_token)
        # if response_status_200(response):
            # json_response = await response.json()
            # json_response = response.json()
        break

    if 'data' not in json_response:
        print('no data')
        return float('nan')
        # break

    for user in json_response['data']:
        if user['id'] in users_set:
            # likers_lock.acquire()
            likers.append(user['username'])
            if len(likers) > 5:
                return ','.join(likers)
                # likers_lock.release()
                # break
            # likers_lock.release()

    # if 'next_token' not in json_response['meta'].keys():
    #     break

    # query_params['pagination_token'] = json_response['meta']['next_token']

    return ','.join(likers) if len(likers) else float('nan')

# def rehydrate_db():

class RehydrationThread(Thread):
    async def actual_work(self):
        queries = []
        users_set = None

        with open('./api/users.txt') as f:
            line = f.read()
            users = line.split('\n')

            users_set = set(users)
            query_len = 0
            query = ''

            for user in users:
                if user == '1009269193':
                    continue
                tmp = 'from:' + user + ' OR '
                if query_len + len(tmp) > 986:
                    # add query to queries
                    queries.append(query[0:-4])
                    query = tmp
                    query_len = len(tmp)
                else:
                    query += tmp
                    query_len += len(tmp)

            queries.append(query[0:-4])

        '''
        all the query combinations:
        mentions, retweet
        '''
        headers =  {'User-Agent': 'v2RecentSearchPython','Authorization': f"Bearer {bearer_token}"}
        for query in queries:
            for relationship in ['has:mentions is:retweet', 'has:mentions -is:retweet', '-has:mentions is:retweet']:
                query_params['query'] = f'({query}) is:verified {relationship}'
                print(query)
                print(relationship)

                async with aiohttp.ClientSession() as session:
                    while True: # break when run out of pages of results to go through
                        json_response = None
                        while True: # keep trying same request till it returns 200 response
                            async with session.get(search_url, headers=headers, params=query_params) as response:
                                if response_status_200(response):
                                    json_response = await response.json()
                                    break

                        if 'data' not in json_response:
                            break

                        users_map = {} # maps mentioned ID to mentioned username
                        for user in json_response['includes']['users']:
                            if user['id'] in users_set: # only want mentions of users we're interested in
                                users_map[user['id']] = user['username']

                        retweets_map = {} # maps retweet ID to retweeted author ID
                        if '-is:retweet' not in relationship: # if it's a retweet
                            for retweet in json_response['includes']['tweets']:
                                if retweet['author_id'] in users_set:
                                    retweets_map[retweet['id']] = retweet['author_id']

                        for entry in json_response['data']:
                            mentions = ""
                            if '-has:mentions' not in relationship: # if it has a mention
                                if 'entities' in entry.keys():
                                    for mention in entry['entities']['mentions']:
                                        if mention['id'] in users_map:
                                            mentions += users_map[mention['id']] + ','
                                        else: # mentioned user's acc was prob suspended
                                            continue
                                else: # doesn't include a mention for some reason so just skip this for the -has:mentions query
                                    continue

                            retweet_from = ""
                            if '-is:retweet' not in relationship: # if it's a retweet
                                for ref_tweet in entry['referenced_tweets']:
                                    if ref_tweet['type'] == 'retweeted' and ref_tweet['id'] in users_set:
                                        retweet_from += retweets_map[ref_tweet['id']] + ','

                            # figure out who liked this tweet
                            likers = float('nan')
                            if '-is:retweet' in relationship: # if it's not a retweet
                                likers = get_likers(users_set, entry['id'])

                            # get whole-tweet polarity score
                            i = 0
                            async with session.post('http://localhost:5000/flask', json={"tweet": entry['text']}) as x:
                                if not (i % 100):
                                    print(i)
                                # x = requests.post('http://localhost:5000/flask', data={"tweet": entry['text']})
                                res = await x.json()
                                data_lock.acquire()
                                data.append([
                                    entry['created_at'],
                                    res['tweetScore'] if res else 0,
                                    entry['text'],
                                    entry['id'],
                                    entry['author_id'],
                                    users_map[entry['author_id']],
                                    mentions[0:-1] if len(mentions) else float('nan'),
                                    retweet_from[0:-1] if len(retweet_from) else float('nan'),
                                    likers,
                                ])
                                data_lock.release()
                                i += 1

                        if 'next_token' not in json_response['meta'].keys():
                            if 'next_token' in query_params:
                                del query_params['next_token']
                            break

                        query_params['next_token'] = json_response['meta']['next_token']
                        print("next_token: " + json_response['meta']['next_token'])

        df = pd.DataFrame(data, columns = [
            'timestamp',        # entry['created_at'],
            'polarity',         # x.json()['tweetScore'] if x.json() else 0,
            'full_text',        # entry['text'],
            'tweet_id',         # entry['id'],
            'account_id',       # entry['author_id'],
            'username',         # users_map[entry['author_id']],
            'mention',          # mentions[0:-1] if len(mentions) else float('nan'),
            'retweet_from',     # retweet_from[0:-1] if len(retweet_from) else float('nan'),
            'liked_by'          # likers,
        ])
        df['timestamp'] = pd.to_datetime(df['timestamp']).view(np.int64) // 10**9
        df.to_csv("boop.csv", index=False)
        print('done')

    def run(self):
        asyncio.run(self.actual_work())

RehydrationThread().start()
