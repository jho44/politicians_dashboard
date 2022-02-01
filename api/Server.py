from flask import send_file, jsonify
from flask_restful import Resource, reqparse
import pandas as pd

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

    args = parser.parse_args()

    arg_type = args['type']

    if arg_type == 'whole':
      return send_file('api/politicians.csv')

    data = pd.read_csv('api/politicians.csv', dtype={'full_text': str, 'mention': object, 'liked_by': object, 'account_id': str})

    if arg_type == 'num_posts_over_time':
      data = data[data['account_id'] == str(args['account_id'])][['polarity', 'timestamp']]
      data['datetime'] = pd.to_datetime(data['timestamp'], unit='ms')
      data.drop('timestamp', axis=1, inplace=True)

      grps = data.groupby(pd.Grouper(key='datetime', freq='T'))
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
        if polarity > 0:
          # white FFFFFF -> red FF0000 interpolation
          # (0, 255), (13, 0)  -- y = -255x/13 + 255
          GB = hex(round(-255 * polarity / 13 + 255)).lstrip("0x")
          return f'#FF{GB}{GB}'
        else:
          # blue 0000FF -> white FFFFFF interpolation
          # (-13, 0), (0, 255) -- y = 255x/13 + 255
          RG = hex(round(255 * polarity / 13 + 255)).lstrip("0x")
          return f'#{RG}{RG}FF'
      # note: could parallelize with http://blog.adeel.io/2016/11/06/parallelize-pandas-map-or-apply/
      colors = mean_polarities.apply(get_color).tolist()

      not_null_indices = mean_polarities.index
      stops = not_null_indices / not_null_indices[-1] * 100

      return jsonify({
        'times': grp_sizes.index.strftime('%m/%d/%Y, %H:%M:%S').tolist(),
        'sizes': grp_sizes.values.tolist(),
        'range': [min_range, max_range],
        'colors': colors,
        'stops': stops.tolist()
      })
    elif arg_type == 'num_left_right_posts':
      data = data[data['account_id'] == str(args['account_id'])]
      num_left = len(data[data['polarity'] < 0]) # number of posts that were overall left-leaning
      return jsonify({
        'num_left': num_left,
        'num_right': len(data) - num_left
      })
    else: # arg_type == 'account_ids'
      return jsonify({
        'account_ids': data['account_id'].unique().tolist()
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