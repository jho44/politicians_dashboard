import torch
from torch import nn

from api.code_inference.decoder.attention import Attention

class AttendedPolarity(torch.nn.Module):
    """
    Applying polarity calculated by the semantic dimensions on the polarity dimension
    Attention mechanism used is:
    https://pytorch.org/docs/master/generated/torch.nn.MultiheadAttention.html
    https://pytorch.org/docs/master/generated/torch.nn.L1Loss.html
    """
    def __init__(self, embed_dim=200, num_heads=1, beta=1):
        """
        Initializes parameters

        Args:
            xxx  : {} yyy

        Returns:
            self
        """
        super(AttendedPolarity,self).__init__()

        self.attn = Attention(embed_dim=embed_dim, num_heads=num_heads)

        # hinge loss
        self.beta = beta
        self.hinge_loss_fn = torch.nn.HingeEmbeddingLoss(beta)
        self.hinge_mode = torch.Tensor([-1 * beta])

        self.mse_loss_fn = nn.MSELoss()

    def set_cuda(self):
        self.hinge_mode = self.hinge_mode.cuda()

    def loss_fn(self, attended_polarity, labels):
        # labels.new handles the device and the data type at the same time
        # + theta times regulation term? (un-entities expected to be neutral)
        return self.hinge_loss_fn(attended_polarity * labels, self.hinge_mode)
    def loss_reg(self, encoder, sentences):
        raw_index, mask = sentences

        mask = torch.transpose(mask, 0, 1)
        # raw_index = torch.transpose(raw_index, 0, 1)
        zeros = torch.zeros_like(raw_index)
        index = torch.where(mask, raw_index, zeros) #~mask for negation of mask
        scores = encoder(index, part="polarity")
        return self.mse_loss_fn(scores, torch.zeros_like(scores))

    def forward(self, encoder, data_sentense):
        sentences, labels, _ = data_sentense
        attn_flattened, raw_index = self.attn(encoder, sentences, part="neutral")
        # raw_polarity = encoder(raw_index, part="polarity").squeeze(-1).T
        raw_polarity = torch.transpose(encoder(raw_index, part="polarity").squeeze(-1), 0, 1)
        attended_polarity = torch.sum(attn_flattened * raw_polarity, dim=1)
        attended_polarity[attended_polarity != attended_polarity] = 0. # get rid of the nans

        # print(attended_polarity)

        if not self.training: # built-in function
            # in evaluation mode
            return attended_polarity, labels, attn_flattened, raw_polarity
        loss = self.loss_fn(attended_polarity, labels) #+ self.loss_reg(encoder, sentences)
        return loss




