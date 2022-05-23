from flask import send_file, jsonify, request
from flask_restful import Resource
import pandas as pd
import numpy as np
import math
from os import path
import requests

from api.data_generation.data_constants import TMP_CSV, OUTPUT_CSV

'''
watch -n0.1 nvidia-smi

python main.py -m 3 -t task3_withent

'''

print("This is not the most recent version of our code\nThe most recent version of our code is kept confidential until paper is accepted\nThanks for your understanding")

tmp_csv = path.join('api', TMP_CSV)
final_csv = path.join('api', OUTPUT_CSV)

class Server(Resource):
  def __init__(self, task_manager):
    self.task_manager = task_manager

  '''
  GET must handle requests asking for different things, as specified by the 'type' query parameter:
    'type' = 'usernames'
      Return all usernames in dataset
      input: none

    'type' = 'num_posts_over_time'
      For a given user, return the number of posts per day within a desired time frame along with colors representing the mean polarity of posts for each day.
      The colors, returned in strings representing RGB values, should be blue for very negative polarity scores and red for very positive polarity scores.
      input:
        - username: Twitter username of desired user
        - start_date (optional): the start of the desired time frame
        - end_date (optional): the end of the desired time frame

    'type' = 'num_left_right_posts'
      Return number of posts with negative and positive polarity scores for a given user.
      input:
        - username: Twitter username of desired user
        - start_date (optional): the start of the desired time frame
        - end_date (optional): the end of the desired time frame

    'type' = 'attn_weights'
      Return attention weights and token polarity scores for tweets from a given user on a given day.
      input:
        - username: Twitter username of desired user
        - curr_time: the start of the day for tweets for which we'd like the polarity scores of
      output: attention weights in list/arr ordered by tokens in input statement

    'type' = 'post_polarity'
      Return polarity scores for all tweets of given user, grouped by year's quarters.
      input:
        - username: Twitter username of desired user
  '''
  def get(self):
    args = request.args

    arg_type = args['type']

    desired_file = tmp_csv if not path.exists(final_csv) and path.exists(tmp_csv) else final_csv
    # in case there's a req while file is being renamed after rehydration
    if arg_type == 'whole':
      return send_file(desired_file)

    desired_file = tmp_csv if not path.exists(final_csv) and path.exists(tmp_csv) else final_csv
    data = pd.read_csv(desired_file, dtype={'full_text': str, 'mention': object, 'liked_by': object, 'username': str})

    if arg_type == 'usernames':
      return jsonify({
        'usernames': data['username'].unique().tolist()
      })
    elif arg_type == 'post_polarity':
      data = data[data['username'] == args['username']]
      data['datetime'] = pd.to_datetime(data['timestamp'], unit='ms')
      data.drop('timestamp', axis=1, inplace=True)

      data = data[["polarity", "datetime"]]
      data['qtr'] = data['datetime'].map(lambda x: "Q" + str((x.month-1)//3 + 1))
      data.drop('datetime', axis=1, inplace=True)
      res = data.to_dict('records')

      return jsonify({
        'res': res
      })
    else:
      data = data[data['username'] == args['username']]
      if 'start_date' in args:
        data = data[(data['timestamp'] >= int(args['start_date'])) &
                (data['timestamp'] <= int(args['end_date']))]

      if arg_type == 'num_posts_over_time':
        data['datetime'] = pd.to_datetime(data['timestamp'], unit='ms', utc=True)
        data.drop('timestamp', axis=1, inplace=True)

        grps = data.groupby(pd.Grouper(key='datetime', freq='D', origin='epoch'))
        # since we're grouping by day, the chart will have an time-axis ending on the start of the last selected day
        grp_sizes = grps.size()

        try:
          min_range = int(grp_sizes.values.min())
          max_range = int(grp_sizes.values.max())
        except ValueError:
          min_range = 0
          max_range = 10

        # get left_right color at each stop
        # since each stop may have multiple posts (and therefore multiple polarities)
        # will need to get average of these posts' polarities to determine color
        mean_polarities = grps.mean()["polarity"].reset_index(drop=True)
        mean_polarities = mean_polarities[mean_polarities.notnull()]

        # liberal leaning,      B (0, 0, 255)       -- lambda = -13
        # neutral leaning,      W (255, 255, 255)   -- lambda = 0
        # conservative leaning, R (255, 0, 0)       -- lambda = 13

        def get_color(polarity):
          # y = 255 * e ^ (-x^2 / 12)
          RGB_comp = hex(round(255 * math.exp(- polarity ** 2 / 4))).lstrip("0x")
          if polarity > 0:
            # white FFFFFF -> red FF0000 interpolation
            # (0, 255), (13, 0)
            return f'#FF{RGB_comp}{RGB_comp}'
          else:
            # blue 0000FF -> white FFFFFF interpolation
            # (-13, 0), (0, 255)
            return f'#{RGB_comp}{RGB_comp}FF'
        # note: could parallelize with http://blog.adeel.io/2016/11/06/parallelize-pandas-map-or-apply/
        colors = mean_polarities.apply(get_color).tolist()

        not_null_indices = mean_polarities.index
        if not_null_indices[-1] == 0:
            stops = [100]
        else:
          stops = (not_null_indices / not_null_indices[-1] * 100).tolist()

        return jsonify({
          'times': grp_sizes.index.strftime('%m/%d/%Y, %H:%M:%S').tolist(),
          'sizes': grp_sizes.values.tolist(),
          'range': [min_range, max_range],
          'colors': colors,
          'stops': stops
        })
      elif arg_type == 'num_left_right_posts':
        num_left = len(data[data['polarity'] < 0]) # number of posts that were overall liberal-leaning
        num_right = len(data[data['polarity'] > 0]) # number of posts that were overall conservative-leaning
        return jsonify({
          'num_left': num_left,
          'num_right': num_right,
        })
      else: # arg_type == 'attn_weights'
        curr_time = int(args['curr_time'])
        data = data[(data['timestamp'] >= curr_time) & (data['timestamp'] <= curr_time + 8.64e+7)]
        # time step is 1 day in milliseconds
        posts = data[['full_text', 'tweet_id' ]]

        results = []
        for idx, post in posts.iterrows():
          # get the polarity score from Patricia's model
          res = self.task_manager.single_line_test(post['full_text'])
          # get the html from Twitter for the pretty tweet
          response = requests.get('https://publish.twitter.com/oembed?url=https://twitter.com/Interior/status/' + str(post['tweet_id']))

          if res:
            results.append({
              "rawTweet": response.json()['html'],
              "tokenPolarities": res["raw_polarity"].tolist(),
              "processedTweet": res["processed_tweet"],
              "tweetScore": 1.*np.float32(res["polarity"]),
              "attention": res["attention"].tolist(),
              "tweetId": post['tweet_id'],
            })
          else:
            results.append(None)

          return results

  '''
  POST just needs to return token polarity scores and attention weights for a given string.
  input: string representing a tweet
  '''
  def post(self):
    tweet = request.json['tweet']
    res = self.task_manager.single_line_test(tweet)

    if res:
      return jsonify({
        "rawTweet": tweet,
        "tokenPolarities": res["raw_polarity"].tolist(),
        "processedTweet": res["processed_tweet"],
        "tweetScore": 1.*np.float32(res["polarity"]),
        "attention": res["attention"].tolist(),
      })
    else:
      return None
