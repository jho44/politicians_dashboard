import torch
import numpy as np
import torch.nn.functional as F
from torch import nn

class Attention(torch.nn.Module):
    """
    My attention
    Attention mechanism used is:
    https://pytorch.org/docs/master/generated/torch.nn.MultiheadAttention.html
    """
    def __init__(self, embed_dim=200, num_heads=1):
        """
        Initializes parameters
 
        Args:
            embed_dim  : {int} embedding dimensions
            num_heads  : {int} number of attention head(s)
            cuda       : {bool} whether using cuda or not
            gpu        : {int} which gpu to use (when there are multiple GPUs in the system)
 
        Returns:
            self
        """
        super(Attention,self).__init__()
        self.attn = nn.MultiheadAttention(embed_dim, num_heads)
        # self.loss_fn = nn.L1Loss()

    def forward(self, encoder, sentences, part="all", train_key=False):
        """
        intermediate results:
            raw_index: max_length X batch_size
            mask: max_length X batch_size
            raw_sentence: max_length X batch_size X dimension
            attn_weights: batch_size X max_length X max_length
            attn_flattened: batch_size X max_length
        """
        raw_index, mask = sentences
        # modify_needed = (torch.all(mask, 1) == True).nonzero(as_tuple=False)
        raw_sentence = encoder(raw_index, part=part) if train_key else encoder(raw_index, part=part).detach()
        
        # print(torch.all(mask, 1).shape) # to modify
        _, attn_weights = self.attn(raw_sentence, raw_sentence, raw_sentence, key_padding_mask=mask)
        attn_flattened = torch.mean(attn_weights, dim=1)
        return attn_flattened, raw_index
 
