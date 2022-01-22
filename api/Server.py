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

    data = pd.read_csv("api/politicians.csv", dtype={'full_text': str, 'mention': object, 'liked_by': object, 'account_id': str})

    if arg_type == 'num_posts_over_time':
      data = data[data['account_id'] == str(args['account_id'])]
      data['datetime'] = pd.to_datetime(data['timestamp'], unit='ms')

      grps = data.groupby(pd.Grouper(key='datetime', freq='T'))
      grp_sizes = grps.size()

      try:
        min_range = int(grp_sizes.values.min())
        max_range = int(grp_sizes.values.max())
      except ValueError:
        min_range = 0
        max_range = 10

      return jsonify({
        "times": grp_sizes.index.strftime("%m/%d/%Y, %H:%M:%S").tolist(),
        "sizes": grp_sizes.values.tolist(),
        "range": [min_range, max_range],
      })
    else: # arg_type == 'account_ids'
      return jsonify({
        "account_ids": data['account_id'].unique().tolist()
      })

  def post(self):
    parser = reqparse.RequestParser()
    parser.add_argument('stmt', type=str)

    args = parser.parse_args()

    stmt = args['stmt']

    if stmt:
      message = "Your Statement: {}".format(stmt)
      status = 200
    else:
      message = "No Statement"
      status = 403

    final_ret = {"status": status, "message": message}

    return final_ret