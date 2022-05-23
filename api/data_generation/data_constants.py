import os

TMP_CSV = 'tmp.csv'
OUTPUT_CSV = 'final.csv'

POLARITY_WAIT_TIME = 100
# LIKE_WAIT_TIME = 50

# GET_LIKERS = False
GET_POLARITIES = True
REHYDRATE_FACTOR = 100

######### Rehydrate dataset with Twitter API #########
OAUTH_BEARER_TOKEN = os.getenv('OAUTH_BEARER_TOKEN')
######################################################

######### Generate dataset with Twitter API #########
BEARER_TOKEN = os.getenv('BEARER_TOKEN')
SEARCH_URL = 'https://api.twitter.com/2/tweets/search/all'
QUERY_PARAMS = {
    'start_time': '2020-01-01T00:00:01Z',
    'end_time': '2020-11-26T23:59:59Z',
    'max_results': '500',
    'tweet.fields': 'id,text,author_id,created_at',
    'user.fields': 'username',
    'expansions': 'entities.mentions.username,referenced_tweets.id.author_id',
}
######################################################