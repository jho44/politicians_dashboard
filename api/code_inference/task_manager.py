import torch
import torch.optim as optim

from api.code_inference.encoder.dataset import Dataset
from api.code_inference.decoder.models import MTLModel # the models

from api.code_inference.utils import use_cuda, list_available_cuda, print_cuda_info, set_cuda, process_raw_tweet

from api.code_inference.sampler import Sampler

import os

def create_task_manager(args):
    """
    creating task manager from command line arguments
    args are the arguments
    """
    print("creating task manager")
    print("\tusing base-model: {}".format(args.basic_model))
    gpu_id = args.gpu_id if (use_cuda() and args.gpu_id in list_available_cuda()) else -1
    cuda = (gpu_id>=0)
    print("\tcuda is {}".format("USED ({})".format(gpu_id) if cuda else "NOT used"))
    if cuda: print_cuda_info(gpu_id)
    dataset = Dataset()
    task_manager = TaskManager(dataset, args.basic_model, args.learning_rate, mask_mode=args.mask_mode, embd_size=args.embedding_size, batch_size=args.batch_size, window_size=args.window_size, mode=args.mode, lambda_=[1., 1., args.lambda_D], directory=os.path.join("api/code_inference/output", args.test_name), gpu_id=gpu_id)
    return task_manager

# the task manager
class TaskManager(object):
    """managing script of training, validation, testing, etc."""
    def __init__(self, dataset, base_model_name, learning_rate, mask_mode="align", embd_size=200, batch_size=2, window_size=2, neg_sample_size=10, mode=1, lambda_=[1., 1., .1], directory="./", gpu_id=-1):
        super(TaskManager, self).__init__()
        # dataset
        self.dataset = dataset
        self.tasks = [m+1 for m in range(mode)]
        # the model name
        self.base_model_name = base_model_name
        self.window_size = window_size
        self.batch_size = batch_size
        self.data_loader = Sampler(dataset, window_size=window_size, neg_sample_size=neg_sample_size, batch_size=batch_size, mask_mode=mask_mode)
        self.model = MTLModel(base_model_name, len(dataset), embd_size, lambda_=lambda_, tasks=self.tasks)

        # optimizer
        learnable_params = self.model.parameters()
        self.optimizer = optim.SGD(learnable_params, lr=learning_rate)

        # losses
        self.losses = list()

        # saved directory
        self.directory = directory

        # using cuda or not?
        self.cuda = (gpu_id >= 0) # using gpu
        self.gpu_id = gpu_id # the exact id of GPU we use

        # instead of model.cuda(gpu_id), model.cuda() by default will send your model to the "current device"
        # which can be set with torch.cuda.set_device(device).
        if self.cuda:
            set_cuda(gpu_id)
            self.model = self.model.cuda()
            self.model.polarity_model.set_cuda()
            # self.model.discriminator.set_cuda()
        self.data_loader.set_cuda(self.cuda)

        # max epoch to determine when is it converged
        self.max_epoch = 200
        self.STOP_INIT = 0
        self.EPS = 1e-5

    def single_line_test(self, raw_tweet):
        directory = self.directory
        self.load()
        self.model.eval()

        # print("Raw Tweet:", raw_tweet)
        tweet_content, _ = process_raw_tweet(raw_tweet)
        # print("Processed:", tweet_content)
        f_tmp = "api/code_inference/tmp.txt"

        with open(f_tmp, "w") as f:
            f.write(tweet_content + "\n")

        with open(f_tmp, "r", encoding="utf8") as fin:
            # in the format of a list
            lines = [line for line in fin.read().split("\n") if len(line.split()) > 0]
            entities = [self.dataset.find_entities(line,fmt=int) for line in lines]

        attended_polarity = None
        if len(lines) > 0:
            user_data = self.data_loader.sample_lines(lines, entities)
            if user_data:
                attended_polarity, _, attn_flattened, raw_polarity = self.model(user_data)

        if attended_polarity and len(attended_polarity):
            return {
                "processed_tweet": tweet_content,
                "polarity": attended_polarity[0],
                "attention": attn_flattened[0,:],
                "raw_polarity": raw_polarity[0,:],
            }
        else:
            return {}

    def list_txt_files(self, path):
        files = [f for f in os.listdir(path) if (f.split(".")[-1] == "txt" and f.find("entities") == -1)]
        return files

    def load(self, vocab_file="vocab.csv", embed_file="embeddings.npz", model_file="model_params.pickle"):
        """
        https://numpy.org/doc/stable/reference/generated/numpy.savez_compressed.html
        https://pytorch.org/tutorials/beginner/saving_loading_models.html
        """
        directory = self.directory
        device_name = 'cuda:{}'.format(self.gpu_id) if self.cuda else 'cpu'
        device = torch.device(device_name)
        # model = torch.load(os.path.join(directory, model_file))
        checkpoint = torch.load(os.path.join(directory, model_file), map_location=torch.device(device_name))
        model = checkpoint["state_dict"]
        optimizer = checkpoint["optimizer"]
        self.model.load_state_dict(model)
        self.optimizer.load_state_dict(optimizer)
        model = self.model.to(device)
        for state in self.optimizer.state.values():
            for k, v in state.items():
                if isinstance(v, torch.Tensor):
                    state[k] = v.to(device)
        # return vocab, embedding, model, optimizer
