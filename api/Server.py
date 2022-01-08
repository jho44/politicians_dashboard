from flask import send_file
from flask_restful import Resource, reqparse

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
    return send_file('api/politicians.csv')

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