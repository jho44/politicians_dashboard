import pandas as pd
import numpy as np
from threading import Thread
import time
import asyncio
import os
import schedule

from api.data_generation.data_utils import connect_to_endpoint, save_to_csv, set_null_polarities, process_entry
from api.data_generation.data_constants import TMP_CSV, OUTPUT_CSV, REHYDRATE_FACTOR, QUERY_PARAMS, SEARCH_URL, BEARER_TOKEN

tmp_csv = os.path.join('api', TMP_CSV)
output_csv = os.path.join('api', OUTPUT_CSV)

class RehydrationThread(Thread):
    async def search_tweets(self, first_row_idx, raw_tweet_ids, csv_obj, task_manager):
        tweet_ids = ','.join([str(tweet_id) for tweet_id in raw_tweet_ids.to_list()])
        json_response = await connect_to_endpoint(f"https://api.twitter.com/2/tweets?ids={tweet_ids}", {}, BEARER_TOKEN, csv_obj, None)

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

        csv_obj.content.to_csv(tmp_csv, index=False)

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
        if os.exists(f'{OUTPUT_CSV}.csv'):
            os.remove(f'{OUTPUT_CSV}.csv')
        os.rename(tmp_csv, f'{OUTPUT_CSV}.csv')

        print("Done rehydrating!")

class GenerationThread(Thread):
    async def actual_work(self):
        queries = []
        users_set = None

        with open('./api/data_generation/users.txt') as f:
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
                QUERY_PARAMS['query'] = f'({query}) is:verified {relationship}'

                print(query)
                print(relationship)

                while True: # break when run out of pages of results to go through
                    json_response = await connect_to_endpoint(SEARCH_URL, QUERY_PARAMS, BEARER_TOKEN, csv_obj, local_tweets)

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
                        if 'next_token' in QUERY_PARAMS:
                            del QUERY_PARAMS['next_token']
                        break

                    QUERY_PARAMS['next_token'] = json_response['meta']['next_token']
                    print('next_token: ' + json_response['meta']['next_token'])

        # if GET_LIKERS:
        #     csv_obj.actual_csv.to_csv(tmp_csv, index=False)
        save_to_csv(csv_obj, local_tweets)
        while True:
            if await set_null_polarities(csv_obj) == "NO MORE":
                break
        save_to_csv(csv_obj, local_tweets)
        if os.path.exists(f'{OUTPUT_CSV}.csv'):
            os.remove(f'{OUTPUT_CSV}.csv')
        os.rename(tmp_csv, f'{OUTPUT_CSV}.csv')

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
