import torch
import torch.nn as nn
import torch.nn.functional as F
import math

class SkipGramModel(nn.Module):
    '''
    https://papers.nips.cc/paper/5021-distributed-representations-of-words-and-phrases-and-their-compositionality.pdf
    Word2Vec SkipGram model
    '''
    def __init__(self, **kwargs):
        super(SkipGramModel, self).__init__()
        # self.cuda

    def forward(self, embeddings, data_word):
        u_pos, v_pos, v_neg = data_word # LongTensor data

        embed_u = embeddings.targets(u_pos)
        pos_embed_v = embeddings.context(v_pos)
        pos_score = torch.sum(torch.mul(embed_u, pos_embed_v), dim = 1)
        pos_output = F.logsigmoid(pos_score).squeeze()
        neg_embed_v = embeddings.context(v_neg)
        neg_score = torch.bmm(neg_embed_v, embed_u.unsqueeze(2)).squeeze()
        neg_score = torch.sum(neg_score, dim = -1)
        neg_output = F.logsigmoid(-1*neg_score).squeeze() #1-sigma(x)=sigma(-x)

        cost = pos_output + neg_output

        n_sample_pairs = pos_embed_v.shape[0] # this is necessary
        loss = (-1 * cost.sum() / n_sample_pairs) if n_sample_pairs else 0

        return loss


