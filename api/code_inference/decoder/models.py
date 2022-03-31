import torch.nn as nn

from api.code_inference.encoder.embedding import * # the encoder
from api.code_inference.decoder.base_models import *
from api.code_inference.decoder.polarity_models import *
from api.code_inference.decoder.discriminator_models import *
from api.code_inference.utils import *

class MTLModel(nn.Module):
    """
    https://arxiv.org/pdf/1904.13341.pdf
    lambda_ = 10, 100, etc. in the paper
    """
    BASE_MODEL = {
        "skipgram": SkipGramModel
    }
    def __init__(self, base_model_name, vocab_size, embd_size, lambda_=[1., 1., .1], tasks=[1, 2, 3]):
        """
        tried on debug set: lambda_=10 --- too waivy; lambda_=1 --- going down to steadily but acceptable for sure
        """
        super(MTLModel, self).__init__()
        base_model = MTLModel.BASE_MODEL.get(base_model_name, None)
        if not base_model:
            error("base model class {} not recognized".format(self.base_model_name))
        self.encoder = BasicEncoder(vocab_size, embd_size)
        self.base_model = base_model()
        self.polarity_model = AttendedPolarity(embed_dim=self.encoder.d_n)
        self.discriminator = Discriminator(embed_dim=self.encoder.d_n)
        self.lambda_= lambda_
        self.tasks  = tasks
        # self.tmp = self.encoder.context_embedding.weight.clone()

        self.phase = "M"

    def set_phase(self, phase="M"):
        if phase not in ["M", "D"]:
            error("phase {} not recognized".format(phase))
        self.phase = phase

    def forward(self, data, phase="M"):
        assert phase in ["M", "D"], "phase {} not recognized".format(phase)
        data_word, data_sentense = data
        if not self.training:
            # in evaluation mode
            if phase == "M":
                attended_polarity, labels, attn_flattened = self.polarity_model(self.encoder, data_sentense)
            else:
                attended_polarity, labels, attn_flattened = self.discriminator(self.encoder, data_sentense)
            # return np.nan_to_num(attended_polarity.cpu().detach().numpy(), nan=0.), labels.cpu().detach().numpy() if labels is not None else labels
            return np.nan_to_num(attended_polarity.cpu().detach().numpy()), labels.cpu().detach().numpy() if labels is not None else labels, \
                    np.nan_to_num(attn_flattened.cpu().detach().numpy())
        # if in training mode
        if phase == "D":
            # training the discriminator
            self.encoder.freeze()
            self.discriminator.unfreeze()
            loss_task1 = self.base_model(self.encoder, data_word).item() # no backtracing in this case
            loss_task2 = self.polarity_model(self.encoder, data_sentense).item()
            loss_task3 = self.discriminator(self.encoder, data_sentense)
            loss = loss_task3
            loss_report = self.lambda_[0] * loss_task1 + self.lambda_[1] * loss_task2 - self.lambda_[2] * loss_task3.item()
            #print(torch.all(torch.eq(self.debug, self.encoder.context_embedding.weight)))
        else: # M
            self.encoder.unfreeze()
            self.discriminator.freeze()
            # print(self.encoder.targets_embedding.weight[1,:10])
            # training the remaining parts
            loss_task1 = self.base_model(self.encoder, data_word) if 1 in self.tasks else 0
            loss_task2 = self.polarity_model(self.encoder, data_sentense) if 2 in self.tasks else 0
            loss_task3 = self.discriminator(self.encoder, data_sentense, train_key=False) if 3 in self.tasks else 0 # not to backtrack on the semantic embeddings
            loss = self.lambda_[0] * loss_task1 + self.lambda_[1] * loss_task2 - self.lambda_[2] * loss_task3
            loss_report = loss.item()
        # print(loss_task1.item(), loss_task2.item())
        return loss, loss_report


