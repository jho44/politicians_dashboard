from flask import send_file, jsonify
from flask_restful import Resource, reqparse
import pandas as pd
import numpy as np
import math
from api.code_inference.task_manager import create_task_manager

'''
watch -n0.1 nvidia-smi

python main.py -m 3 -t task3_withent

'''

class ModelArgs:
  embedding_size = 200
  n_epoch= 3
  batch_size= 16
  window_size= 1
  learning_rate= 0.8
  basic_model= "skipgram"
  test_name= "task3_withent"
  lambda_D= 0.1
  fixed_seed= 1
  mode= 3
  mask_mode= "entities"
  gpu_id= 0

print("This is not the most recent version of our code\nThe most recent version of our code is kept confidential until paper is accepted\nThanks for your understanding")

args = ModelArgs()
task_manager = create_task_manager(args)

class Server(Resource):
  '''
  Need paths for:
    Returning attention weights of a statement
    input: statement
    output: attention weights in list/arr ordered by tokens in input statement

    Returning d3 data for timeline graph
    input: relationship
  '''

  def get(self):
    parser = reqparse.RequestParser()
    parser.add_argument('type', type=str)
    parser.add_argument('account_id', type=int)
    parser.add_argument('start_date', type=int, required=False)
    parser.add_argument('end_date', type=int, required=False)
    parser.add_argument('curr_time', type=int, required=False)

    args = parser.parse_args()

    arg_type = args['type']

    if arg_type == 'whole':
      return send_file('api/politicians.csv')

    data = pd.read_csv('api/politicians.csv', dtype={'full_text': str, 'mention': object, 'liked_by': object, 'account_id': str})

    if arg_type == 'account_ids':
      return jsonify({
        'account_ids': data['account_id'].unique().tolist()
      })
    else :
      data = data[data['account_id'] == str(args['account_id'])]
      if args['start_date']:
        data = data[(data['timestamp'] >= args['start_date']) & (data['timestamp'] <= args['end_date'])]

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
        num_left = len(data[data['polarity'] < 0]) # number of posts that were overall left-leaning
        return jsonify({
          'num_left': num_left,
          'num_right': len(data) - num_left
        })
      elif arg_type == 'attn_weights':
        data = data[(data['timestamp'] >= args['curr_time']) & (data['timestamp'] <= args['curr_time'] + 8.64e+7)]
        # time step is 1 day in milliseconds
        posts = data['full_text'] #.str.split(r"[(.\")(?\")(!\")!?.]\s+").values # split into sentences

        results = []
        for post in posts:
          res = task_manager.single_line_test(post)

          if res:
            results.append({
              "raw_tweet": post,
              "tokenPolarities": res["raw_polarity"].tolist(),
              "processedTweet": res["processed_tweet"],
              "tweetScore": 1.*np.float32(res["polarity"]),
              "attention": res["attention"].tolist(),
            })
          else:
            results.append(None)

          return results
      else: # arg_type == 'post_polarity'
        data['datetime'] = pd.to_datetime(data['timestamp'], unit='ms')
        data.drop('timestamp', axis=1, inplace=True)

        data = data[["polarity", "datetime"]]
        data['qtr'] = data['datetime'].map(lambda x: "Q" + str((x.month-1)//3 + 1))
        data.drop('datetime', axis=1, inplace=True)
        res = data.to_dict('records')

        return jsonify({
          'res': res
        })

  def post(self):
    parser = reqparse.RequestParser()
    parser.add_argument('tweet', type=str)
    args = parser.parse_args()
    res = task_manager.single_line_test(args.tweet)

    if res:
      return jsonify({
        "rawTweet": args.tweet,
        "tokenPolarities": res["raw_polarity"].tolist(),
        "processedTweet": res["processed_tweet"],
        "tweetScore": 1.*np.float32(res["polarity"]),
        "attention": res["attention"].tolist(),
      })
    else:
      return None
