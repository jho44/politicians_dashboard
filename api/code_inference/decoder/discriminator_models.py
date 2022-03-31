import torch
import torch.nn as nn
import torch.nn.functional as F

from api.code_inference.decoder.attention import Attention


class NaiveClassify(nn.Module):
    def __init__(self, input_dim, hidden_size=100, n_class=2):
        super(NaiveClassify, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_size)
        self.fc2 = nn.Linear(hidden_size, n_class)
        self.criterion = nn.CrossEntropyLoss()
        self.dropout = nn.Dropout(0.1)

    def forward(self, x):
        x = self.dropout(F.relu(self.fc1(x)))
        x = self.fc2(x)
        x = F.softmax(x, dim=1)
        return x

    def loss(self, outputs, labels):
        return self.criterion(outputs, labels)

class Discriminator(nn.Module):
    def __init__(self, embed_dim=200, num_heads=1):
        super(Discriminator, self).__init__()
        self.attn = Attention(embed_dim=embed_dim, num_heads=num_heads)
        self.discriminator = NaiveClassify(embed_dim)

    def freeze(self):
        for param in self.parameters():
            param.requires_grad = False

    def unfreeze(self):
        for param in self.parameters():
            param.requires_grad = True

    # def set_cuda(self):
    #     self.discriminator = self.discriminator.cuda()

    def forward(self, encoder, data_sentense, train_key=False):
        sentences, _ , labels = data_sentense

        attn_flattened, raw_index = self.attn(encoder, sentences, part="neutral", train_key=train_key)
        raw_meaning = encoder(raw_index, part="neutral").permute(1,0,2)
        attn_flattened = attn_flattened.unsqueeze(2)
        attended = torch.sum(attn_flattened * raw_meaning, dim=1)

        classes = self.discriminator(attended)

        if not self.training:
            # in evaluation mode
            preds = classes.max(1)[1].type_as(labels)
            return preds, labels, attn_flattened
        else:
            # in training mode
            loss = self.discriminator.loss(classes, labels)
            # print(loss)
            return loss


