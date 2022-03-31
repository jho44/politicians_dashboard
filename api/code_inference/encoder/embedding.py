import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import numpy as np

class BasicEncoder(nn.Module):
    '''
    reference: https://pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html
        Note: encoder and decoder should be optimized separately in this case
    '''
    def __init__(self, vocab_size, embd_size, polarity_dim=1):
        super(BasicEncoder, self).__init__()
        # we should train separate embeddings for context and target, in the sense that one should not be assumed to appear in its own context
        self.context_embedding = nn.Embedding(vocab_size, embd_size)
        self.targets_embedding = nn.Embedding(vocab_size, embd_size)
        self.embedding_dim = embd_size
        self.polarity_dim = polarity_dim
        self.normalize_init(embd_size)
        # sizes
        self.d_n = embd_size - polarity_dim
        self.d_p = polarity_dim
        self.d = embd_size

    def normalize_init(self, embd_size):
        nn.init.normal_(self.context_embedding.weight, std=1.0 / math.sqrt(embd_size))
        nn.init.normal_(self.targets_embedding.weight, std=1.0 / math.sqrt(embd_size))

    def freeze(self):
        self.context_embedding.weight.requires_grad = False
        self.targets_embedding.weight.requires_grad = False

    def unfreeze(self):
        self.context_embedding.weight.requires_grad = True
        self.targets_embedding.weight.requires_grad = True

    def forward(self, inputs, target=False, part="all"):
        '''
        target or context, either embedding should be fine
        '''
        embedding_func = self.targets if target else self.context
        embedded = embedding_func(inputs)
        if part == "neutral":
            embedded = embedded[...,:-self.polarity_dim]
        elif part == "polarity":
            embedded = embedded[...,-self.polarity_dim:]
        return embedded

    def context(self, inputs):
        embedded = self.context_embedding(inputs)
        return embedded
    def targets(self, inputs):
        embedded = self.targets_embedding(inputs)
        return embedded

    def save_embeddings(self, file_name):
        target_embedding_weights = self.targets_embedding.weight.cpu().data.numpy()
        embedding_weights = self.context_embedding.weight.cpu().data.numpy()
        # ordered by idx, should be loaded togther with the vocabulary dictionary
        np.savez_compressed(file_name, target=target_embedding_weights, context=embedding_weights)

    def load_embeddings(self, file_name):
        return np.load(file_name)['target']





