import requests
import datetime
import numpy as np
import pandas as pd
from os import path
import asyncio
import time
from threading import Thread

from api.data_generation.data_constants import TMP_CSV, POLARITY_WAIT_TIME

class WaitingThread(Thread):
    def run(self):
        time.sleep(60 * 15)

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
    if path.exists(TMP_CSV):
        df.to_csv(TMP_CSV, mode='a', index=False, header=False)
    else:
        df.to_csv(TMP_CSV, mode='w', index=False, header=True)

    csv_obj.actual_csv = pd.read_csv(TMP_CSV, engine='python')

    local_tweets.data = []

def get_first_null_row_index(type, csv_obj):
    for row in csv_obj.actual_csv.itertuples():
        if (type == 'polarity' and row.polarity == 'a') or (type == 'liked_by' and row.liked_by == 'a'):
            return row.Index

    return None

async def set_polarity(ind, row, start_index, csv_obj, task_manager):
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

    csv_obj.actual_csv.to_csv(TMP_CSV, index=False)
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
    QUERY_PARAMS = {}

    json_response = await connect_to_endpoint(f'https://api.twitter.com/2/tweets/{tweet_id}/liking_users', QUERY_PARAMS, BEARER_TOKEN, csv_obj)

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
                # if mention['id'] in users_map and mention['id'] in users_set:
                if mention['id'] in users_map:
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
