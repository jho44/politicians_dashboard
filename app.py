from flask import Flask, send_from_directory
from flask_restful import Api
from flask_cors import CORS #comment this on deployment
from api.Server import Server

import schedule
import time
import requests
import os
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from threading import Thread
import time
from api.code_inference.task_manager import create_task_manager
import asyncio
import datetime
from os import path

load_dotenv()

app = Flask(__name__, static_url_path='', static_folder='frontend/build')
CORS(app) #comment this on deployment
api = Api(app)

@app.route('/', defaults={'path':''})
def serve(path):
    return send_from_directory(app.static_folder,'index.html')

class ModelArgs:
  embedding_size = 200
  n_epoch= 3
  batch_size= 16
  window_size= 1
  learning_rate= 0.8
  basic_model= 'skipgram'
  test_name= 'task3_withent'
  lambda_D= 0.1
  fixed_seed= 1
  mode= 3
  mask_mode= 'entities'
  gpu_id= 0

args = ModelArgs()
task_manager = create_task_manager(args)

api.add_resource(Server, '/flask', resource_class_kwargs={'task_manager': task_manager})

TMP_CSV = 'api/tmp'
OUTPUT_CSV = 'api/final'

POLARITY_WAIT_TIME = 100
# LIKE_WAIT_TIME = 50
'''
The rate limit for getting people who liked a tweet is too restrictive
a dataset of our size (~200K-300K) so the parts about getting likers
will be commented out.
'''
# GET_LIKERS = False
GET_POLARITIES = True
REHYDRATE_FACTOR = 100

######### Rehydrate dataset with Twitter API #########
oauth_bearer_token = os.getenv('OAUTH_BEARER_TOKEN')
######################################################

######### Generate dataset with Twitter API #########
bearer_token = os.getenv('BEARER_TOKEN')
search_url = 'https://api.twitter.com/2/tweets/search/all'
query_params = {
    'start_time': '2020-01-01T00:00:01Z',
    'end_time': '2020-11-26T23:59:59Z',
    'max_results': '500',
    'tweet.fields': 'id,text,author_id,created_at',
    'user.fields': 'username',
    'expansions': 'entities.mentions.username,referenced_tweets.id.author_id',
}
######################################################

# https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/Recent-Search/recent_search.py
def bearer_oauth(r, token):
    '''
    Method required by bearer token authentication.
    '''
    r.headers['Authorization'] = f'Bearer {token}'
    r.headers['User-Agent'] = 'v2RecentSearchPython'
    return r

def save_to_csv(csv_obj, local_tweets): # saves newest tweets to csv
    df = pd.DataFrame(local_tweets.data, columns = [
        'timestamp',        # entry['created_at'],
        'full_text',        # entry['text'],
        'tweet_id',         # entry['id'],
        'account_id',       # entry['author_id'],
        'username',         # users_map[entry['author_id']],
        'mention',          # mentions[0:-1] if len(mentions) else float('nan'),
        'retweet_from',     # retweet_from if len(retweet_from) else float('nan'),
        # 'liked_by',          # likers,
        'polarity',         # x.json()['tweetScore'] if x.json() else 0,
    ])
    df['timestamp'] = pd.to_datetime(df['timestamp']).view(np.int64) // 10**6
    if path.exists(f'{TMP_CSV}.csv'):
        df.to_csv(f'{TMP_CSV}.csv', mode='a', index=False, header=False)
    else:
        df.to_csv(f'{TMP_CSV}.csv', mode='w', index=False, header=True)

    csv_obj.actual_csv = pd.read_csv(f'./{TMP_CSV}.csv', engine='python')

    local_tweets.data = []

def get_first_null_row_index(type, csv_obj):
    for row in csv_obj.actual_csv.itertuples():
        if (type == 'polarity' and row.polarity == 'a') or (type == 'liked_by' and row.liked_by == 'a'):
            return row.Index

    return None

async def set_polarity(ind, row, start_index, csv_obj):
    if ind % 100 == 0:
        ct = datetime.datetime.now()
        print(start_index + ind, ct)
    res = task_manager.single_line_test(row)

    csv_obj.actual_csv.at[start_index + ind, 'polarity'] = 1.*np.float32(res['polarity']) if res else 0

async def set_null_polarities(csv_obj):
    start_index = get_first_null_row_index('polarity', csv_obj)
    if start_index == None:
        return "NO MORE"

    csv_obj.actual_csv.at[start_index:start_index + POLARITY_WAIT_TIME, 'polarity'] = None

    print('start_index: ', start_index)
    print('start index should now be ', str(start_index + POLARITY_WAIT_TIME))

    statements = [set_polarity(ind, row, start_index, csv_obj) for ind, row in enumerate(csv_obj.actual_csv['full_text'][start_index:start_index + POLARITY_WAIT_TIME])]
    await asyncio.gather(*statements)

    csv_obj.actual_csv.to_csv(f'./{TMP_CSV}.csv', index=False)
    print('SAVED ', start_index, ' to ', start_index + POLARITY_WAIT_TIME)
    return "SAVED"

async def connect_to_endpoint(url, params, token, csv_obj, local_tweets=None):
    response = None
    tries_ctr = 0
    while True:
        response = requests.get(url, auth=lambda r: bearer_oauth(r, token), params=params)
        if response.status_code == 429:
            t = WaitingThread()

            if tries_ctr >= 2:
                print('long wait')
                t.start() # wait 15 mins before trying again, to get around rate limit
                save_to_csv(csv_obj, local_tweets)
                await set_null_polarities(csv_obj) # use Patricia's model to fill in polarity values
                t.join()
                print('done waiting')
            else:
                time.sleep(2)
                tries_ctr += 1
        elif response.status_code != 200:
            raise Exception(response.status_code, response.text)
        else:
            return response.json()

'''
async def get_likers(users_set, tweet_id, ind, start_index, csv_obj):
    if ind % 100 == 0:
        ct = datetime.datetime.now()
        print("LIKER ", start_index + ind, ct)

    if type(csv_obj.actual_csv.loc[start_index + ind]['retweet_from']) == str: # if it's a retweet, then no likes
        csv_obj.actual_csv.at[start_index + ind, 'liked_by'] = float('nan')

    likers = []
    query_params = {}

    json_response = await connect_to_endpoint(f'https://api.twitter.com/2/tweets/{tweet_id}/liking_users', query_params, oauth_bearer_token, csv_obj)

    if 'data' not in json_response:
        print('no data')
        csv_obj.actual_csv.at[start_index + ind, 'liked_by'] = float('nan')
        return

    for user in json_response['data']:
        if user['id'] in users_set:
            likers.append(user['username'])
            if len(likers) > 5:
                csv_obj.actual_csv.at[start_index + ind, 'liked_by'] = ','.join(likers)
                return

    csv_obj.actual_csv.at[start_index + ind, 'liked_by'] = ','.join(likers) if len(likers) else float('nan')
'''

async def process_entry(entry, relationship, users_map, users_set, retweets_map, local_tweets, other_tweets):
    mentions = ''
    if '-has:mentions' not in relationship: # if it has a mention
        if 'entities' in entry.keys():
            for mention in entry['entities']['mentions']:
                if mention['id'] in users_map and mention['id'] in users_set:
                    mentions += users_map[mention['id']] + ','
                else: # mentioned user's acc was prob suspended
                    continue
        else: # doesn't include a mention for some reason so just skip this for the -has:mentions query
            return

    tweet_content = entry['text']
    retweet_from = ''
    if '-is:retweet' not in relationship: # if it's a retweet
        for ref_tweet in entry['referenced_tweets']:
            if ref_tweet['type'] == 'retweeted' and ref_tweet['id'] in retweets_map and retweets_map[ref_tweet['id']] in users_map and other_tweets != None:
                retweet_from = users_map[retweets_map[ref_tweet['id']]]

                # get the full text of the tweet
                for tweet in other_tweets:
                    if tweet['id'] == ref_tweet['id']:
                        tweet_content = tweet['text']
                        break
                break # I think you can only retweet one tweet at a time...

    # figure out who liked this tweet
    # if '-is:retweet' in relationship: # if it's not a retweet
    #     likers = get_likers(users_set, entry['id'])

    local_tweets.data.append([
        entry['created_at'],
        tweet_content,
        entry['id'],
        entry['author_id'],
        users_map[entry['author_id']],
        mentions[0:-1] if len(mentions) else float('nan'),
        retweet_from if len(retweet_from) else float('nan'),
        # 'a', # for likers
        'a'
    ])

class WaitingThread(Thread):
    def run(self):
        time.sleep(60 * 15)

class RehydrationThread(Thread):
    async def search_tweets(self, first_row_idx, raw_tweet_ids, csv_obj):
        tweet_ids = ','.join([str(tweet_id) for tweet_id in raw_tweet_ids.to_list()])
        json_response = await connect_to_endpoint(f"https://api.twitter.com/2/tweets?ids={tweet_ids}", {}, oauth_bearer_token, csv_obj, None)

        # no worries that altering csv across threads(?) will lead to inconsistency
        # because drops don't change dataframe indices

        resp = json_response['data']

        i = 0 # for iterating through json_response
        for j in range(first_row_idx, first_row_idx + len(raw_tweet_ids)): # iterating through csv
            if i >= len(resp):
                csv_obj.content.drop([idx for idx in range(j, len(raw_tweet_ids))], inplace=True)
                break

            if str(csv_obj.content.loc[j, 'tweet_id']) != resp[i]['id']:
                csv_obj.content.drop(j, inplace=True) # this tweet is now unavailable (protected, deleted, etc.)
            else:
                if csv_obj.content.loc[j, 'full_text'] != resp[i]['text'] and resp[i]['text'][0:2] != 'RT':
                    # if the updated text is diff and it's not a retweet
                    # (important b/c we assume retweets can't change outside of being deleted)
                    # recalc the polarity score
                    res = task_manager.single_line_test(resp[i]['text'])
                    csv_obj.content.at[j, 'polarity'] = 1.*np.float32(res['polarity']) if res else float('nan')

                    # update the text
                    csv_obj.content.at[j, 'full_text'] = resp[i]['text']

                i += 1 # look at next returned tweet

        csv_obj.content.to_csv(f'./{TMP_CSV}.csv', index=False)

    async def actual_work(self):
        csv_obj = type('', (), {})()
        csv_obj.content = pd.read_csv(f'./{OUTPUT_CSV}.csv', engine='python')

        statements = [self.search_tweets(
            j * REHYDRATE_FACTOR,
            csv_obj.content.loc[j * REHYDRATE_FACTOR:(j+1) * REHYDRATE_FACTOR - 1, 'tweet_id'],
            csv_obj
        ) for j in range(len(csv_obj.content) // REHYDRATE_FACTOR + 1)]

        await asyncio.gather(*statements)

    def run(self):
        asyncio.run(self.actual_work())
        if path.exists(f'{OUTPUT_CSV}.csv'):
            os.remove(f'{OUTPUT_CSV}.csv')
        os.rename(f'{TMP_CSV}.csv', f'{OUTPUT_CSV}.csv')

        print("Done rehydrating!")

class GenerationThread(Thread):
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

        local_tweets = type('', (), {})()
        local_tweets.data = []

        csv_obj = type('', (), {})()

        save_to_csv(csv_obj, local_tweets)

        # if GET_LIKERS:
        #     start_index = get_first_null_row_index('liked_by', csv_obj)
        #     if start_index == None:
        #         return

        #     await asyncio.gather(*[get_likers(users_set, tweet_id, ind, start_index, csv_obj) for ind, tweet_id in enumerate(csv_obj.actual_csv[start_index:start_index + LIKE_WAIT_TIME]['tweet_id'])])

        '''
        all the query combinations:
        mentions, retweet
        '''
        for query in queries:
            for relationship in ['has:mentions is:retweet', 'has:mentions -is:retweet', '-has:mentions is:retweet']:
                query_params['query'] = f'({query}) is:verified {relationship}'

                print(query)
                print(relationship)

                while True: # break when run out of pages of results to go through
                    json_response = await connect_to_endpoint(search_url, query_params, bearer_token, csv_obj, local_tweets)

                    if 'data' not in json_response:
                        break

                    users_map = {} # maps mentioned ID to mentioned username
                    for user in json_response['includes']['users']:
                        users_map[user['id']] = user['username']

                    retweets_map = {} # maps retweet ID to retweeted author ID
                    if '-is:retweet' not in relationship: # if it's a retweet
                        for retweet in json_response['includes']['tweets']:
                                retweets_map[retweet['id']] = retweet['author_id']

                    other_tweets = json_response['includes']['tweets'] if 'includes' in json_response and 'tweets' in json_response['includes'] else None
                    statements = [process_entry(
                        entry,
                        relationship,
                        users_map,
                        users_set,
                        retweets_map,
                        local_tweets,
                        other_tweets
                    ) for entry in json_response['data']]

                    await asyncio.gather(*statements)

                    if 'next_token' not in json_response['meta'].keys():
                        if 'next_token' in query_params:
                            del query_params['next_token']
                        break

                    query_params['next_token'] = json_response['meta']['next_token']
                    print('next_token: ' + json_response['meta']['next_token'])

        # if GET_LIKERS:
        #     csv_obj.actual_csv.to_csv(f'./{TMP_CSV}.csv', index=False)
        save_to_csv(csv_obj, local_tweets)
        while True:
            if await set_null_polarities(csv_obj) == "NO MORE":
                break
        save_to_csv(csv_obj, local_tweets)
        if path.exists(f'{OUTPUT_CSV}.csv'):
            os.remove(f'{OUTPUT_CSV}.csv')
        os.rename(f'{TMP_CSV}.csv', f'{OUTPUT_CSV}.csv')

        print('Done generating!')

    def run(self):
        asyncio.run(self.actual_work())

class SchedulerThread(Thread):
    def run(self):
        while True:
            # Checks whether a scheduled task
            # is pending to run or not
            schedule.run_pending()
            time.sleep(1)

def rehydrate_db():
    RehydrationThread().start()

# schedule.every().saturday.do(rehydrate_db) # uncomment upon deployment