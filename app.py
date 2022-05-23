from flask import Flask, send_from_directory
from flask_restful import Api
from flask_cors import CORS #comment this on deployment
from api.Server import Server

from dotenv import load_dotenv
from api.code_inference.task_manager import create_task_manager
from api.data_generation.data_threads import RehydrationThread

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
# Interfaces with Patricia's model to generate polarity scores for tweets
task_manager = create_task_manager(args)

# Delegates all requests from the frontend to the `/flask` endpoint
api.add_resource(Server, '/flask', resource_class_kwargs={'task_manager': task_manager})

'''
The rate limit for getting people who liked a tweet is too restrictive
a dataset of our size (~200K-300K) so the parts about getting likers
will be commented out.
'''

def rehydrate_db():
    RehydrationThread().start()

'''
uncomment the following 2 lines for data rehydration functionality
'''

# import schedule
# schedule.every().saturday.do(rehydrate_db)