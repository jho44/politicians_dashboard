import random
import pandas as pd
import math
import random
import numpy as np
import nltk

from api.code_inference.utils import *

# vocab = self.dataset.load_vocab(os.path.join(directory, vocab_file))
class Dataset(object):
    def __init__(self, vocab_path="./api/code_inference/output/task3_withent/vocab.csv"):
        self.build_dataset(vocab_path)
        nltk.download('averaged_perceptron_tagger')

    def __len__(self):
        return len(self.idx2word)

    def find_entities(self, line, fmt=str):
        # tokens to select from
        tokens = [t.replace("\x01", " ") for t in line.split() if len(t)]
        # phrases, hashtags, at, must be mentions
        mentions = set([t for t in tokens if t.find(" ") != -1 or t[0] in ["#", "@"]])
        # entities from POS tagging
        pos_tag = nltk.pos_tag(tokens)
        mentions = mentions.union(pt[0] for pt in pos_tag if pt[1] in ["NN", "NNP", "NNS", "NNPS"])

        return [(lambda x: fmt(1) if x in mentions else fmt(0))(t) for t in tokens]

    def parse_sentences(self, data_files, sentence_labels):
        data = list()
        for data_file, label in zip(data_files, sentence_labels):
            # files read
            raw_text = open(data_file, encoding="utf8").read().split("\n")
            raw_ent_labels = [self.find_entities(line, fmt=int) for line in raw_text]
            # entity identified
            raw_lines = [(self.parse_tokens(sentence), entities, label) for sentence, entities in zip(raw_text, raw_ent_labels)]


            nonempty = [s for s in raw_lines if len(s[0]) > 0] # nonempty sentences are kept
            data.extend(nonempty)

        random.shuffle(data) # randomly shuffle data
        unzipped_object = zip(*data)
        raw_sentences, entity_labels, labels = list(unzipped_object)
        return raw_sentences, entity_labels, labels


    def parse_tokens(self, raw_sentence):
        s = [w.replace('\x01', ' ') for w in raw_sentence.split()]
        return [w for w in s if len(w) > 0] # nonempty words are kept

    def idx2sentence(self, index):
        return " ".join(self.indexes2tokens(index))

    def get_index(self, word):
        return self.word2idx.get(word, 0)

    def build_dataset(self, vocab_path):
        df = pd.read_csv(vocab_path, sep="\t")
        vocab = list(df["word"])
        index = list(df["idx"])
        count = list(df["count"])

        #build dictionary，the higher word frequency is, the top word is
        self.word2idx = dict(zip(vocab, index))
        self.idx2word = dict(zip(index, vocab))
        # print(len(self.word2idx), len(self.idx2word), len(vocab), len(index))


        # import collections

        # repeated = [item for item, count in collections.Counter(vocab).items() if count > 1]
        self.count = list(zip(vocab, count))

    def sentence2indexes(self, raw_sentence):
        """
        show the tokens of a sentence in order (input the list of token ids)
        used for debugging
        """
        tokens = self.parse_tokens(raw_sentence)
        index = [self.get_index(t) for t in tokens]
        return index

    def indexes2tokens(self, index):
        """
        translate from index list to token list
        """
        return [self.idx2word[t] for t in index]


    # randomly discard common words, and keep the same frequency ranking
    def subsampling(self, data):
        count = [c[1] for c in self.count]
        frequency = count / np.sum(count)
        prob = dict()
        t = 1e-3 # the fewer words kept in the dataset, the smaller this number

        # calculate discard probability
        for idx, x in enumerate(frequency):
            y = math.sqrt(t / x)
            prob[idx] = y
        subsampled_data = list()
        for line in data:
            subsampled_line = list()
            for word in line:
                if random.random() < prob[word]:
                    subsampled_line.append(word)
            subsampled_data.append(subsampled_line)
        return subsampled_data

    def save_vocab(self, fname):
        idx = list(self.idx2word.keys())
        word = [self.idx2word[i] for i in idx]
        word_cntdict = dict(self.count)
        count = [word_cntdict[w] for w in word]
        data = {"idx": idx, "word": word, "count": count}
        df = pd.DataFrame(data=data)
        df.to_csv(fname, index=None, sep="\t")

    def load_vocab(self, fname):
        return pd.read_csv(fname, sep="\t")



