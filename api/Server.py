from flask import send_file, jsonify
from flask_restful import Resource, reqparse
import pandas as pd
import math

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

    args = parser.parse_args()

    arg_type = args['type']

    if arg_type == 'whole':
      return send_file('api/politicians.csv')
    elif arg_type == 'test':
      return send_file('api/data.csv')

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
        # posts = data['full_text']
        # posts.full_text.str.split(r"[(.\")(?\")(!\")!?.]\s+").values # split into sentences

        post = [
          [
            "abortion",
            "access",
            "is",
            "health",
            "care",
            "period",
            "as",
            "co-chair",
            "of",
            "the",
            "pro-choice",
            "caucus",
            "i",
            "will",
            "fight",
            "any",
            "attempt",
            "to",
            "interfere",
            "in",
            "a",
            "woman's",
            "constitutional",
            "right",
            "to",
            "choose",
            "#sotu",
          ],
          [
            "being",
            "pro-life",
            "is",
            "wanting",
            "the",
            "most",
            "for",
            "women",
            "and",
            "their",
            "children",
            "it",
            "is",
            "recognizing",
            "every",
            "person",
            "deserves",
            "a",
            "chance",
            "to",
            "live",
            "#whywemarch",
          ],
        ]

        trigram_weights = [
          [
            0.11000392350720457, 0.027753256063696836, 0.0, 0.01698094704034859,
            0.00040684266706241375, 0.022323664106730277, 0.0, 0.4905698025174466,
            0.0, 0.0, 0.2888449640949988, 0.016011572708793265,
            0.005453279524286329, 0.0, 0.0, 0.0, 0.001411262989865475, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0, 0.009968161550774558, 0.0, 0.0,
            0.010272323228792273,
          ],
          [
            0.0, 0.07315461940729052, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0739448001194151,
            0.0, 0.0, 0.013475237893787894, 0.0, 0.0, 0.0, 0.0, 0.02260653998362492,
            0.0, 0.0, 0.01404085112697572, 0.0, 0.0, 0.8027779514689058,
          ],
        ]

        polarity_scores = [
          [
            1.19, -3.98, -0.16, -5.94, -2.34, -0.35, 0.44, 0.39, 0.59, 1.05, -2.65,
            -3.79, 0.92, 1.12, -5.24, 0.98, -2.91, -0.02, -2.24, 0.25, -0.66, -8.36,
            4.22, -0.42, -0.02, -1.4, 3.8,
          ],
          [
            -0.08, 16.87, -0.16, 5.4, 1.05, 1.0, 0.14, -5.04, 0.88, -0.26, -6.58,
            -0.3, -0.16, 1.51, -4.36, -1.4, -4.22, -0.66, -1.29, -0.02, -0.64, 4.92,
          ],
        ]

        sentence_scores = [-0.369, 1.832]

        return jsonify({
          'post': post,
          'trigramWeights': trigram_weights,
          'polarityScores': polarity_scores,
          'sentenceScores': sentence_scores,
        })
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
    parser.add_argument('stmt', type=str)

    args = parser.parse_args()

    stmt = args['stmt']

    if stmt:
      message = 'Your Statement: {}'.format(stmt)
      status = 200
    else:
      message = 'No Statement'
      status = 403

    final_ret = {'status': status, 'message': message}

    return final_ret