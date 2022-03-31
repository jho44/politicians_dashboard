import numpy as np

from api.code_inference.utils import *

# sampler
class Sampler:
    def __init__(self, dataset, window_size, neg_sample_size, batch_size, mask_mode="align"):
        self.dataset = dataset

        self.window_size = window_size
        self.neg_sample_size = neg_sample_size
        self.span = 2 * window_size + 1
        self.batch_size = batch_size

        self.sample_table = self.init_sample_table()

        self.to_device = self.to_cpu
        self.keep_type = self.no_typechange_cpu

        self.mask_mode = mask_mode
        if mask_mode == "align":
            self.masking = self.mask_align
            self.is_valid_sentence = self.is_valid_sentence_basic
            # self.is_valid_sentence = self.is_valid_sentence_entities # for debug
        elif mask_mode == "entities":
            self.masking = self.mask_entities
            self.is_valid_sentence = self.is_valid_sentence_entities
        else:
            print("mask mode {} unrecognized".format(mask_mode))
            exit(0)

    def __call__(self, mode="tests", **kwargs):
        return self.generate_batch(mode, **kwargs)

    def init_sample_table(self):
        count = [ c[1] for c in self.dataset.count]
        pow_freq = np.array(count) ** 0.75
        pow_sum = np.sum(pow_freq)
        ratio = pow_freq / pow_sum

        table_size = 1e6
        count = np.round(ratio * table_size)
        sample_table = []

        for idx, x in enumerate(count):
            sample_table += [idx] * int(x)
        return np.array(sample_table)

    def to_cuda(self, tensor, float_=False):
        # torch.LongTensor(tensor).cuda()
        return self.to_cpu(tensor, float_=float_).cuda()
    def to_cpu(self, tensor, float_=False):
        if float_: return torch.FloatTensor(tensor)
        return torch.LongTensor(tensor)
    def no_typechange_cuda(self, tensor):
        return tensor.cuda()
    def no_typechange_cpu(self, tensor):
        return tensor
    def set_cuda(self, cuda):
        self.to_device = self.to_cuda if cuda else self.to_cpu
        self.keep_type = self.no_typechange_cuda if cuda else self.no_typechange_cpu

    def generate_batch(self, mode="tests", batch_size=None):
        data = self.dataset.test_data
        entity = self.dataset.test_entity
        label = self.dataset.test_label

        if batch_size is None:
            batch_size = self.batch_size

        pos_u = list()
        pos_v = list()
        sentence = list()
        entity_list = list()
        sentence_labels = list()
        ready = False
        for i, (row, entities, polarity) in enumerate(zip(data, entity, label)):
            for col_index in range(len(row) - self.span):
                data_buffer = row[col_index : col_index + self.span]
                context = data_buffer[:self.window_size] + data_buffer[self.window_size+1:]
                target = data_buffer[self.window_size]

                pos_u.extend([target for _ in context])
                pos_v.extend(context)

            tmp_data_size = len(pos_u)

            if self.is_valid_sentence(row, entities):
                sentence.append(np.array(row))
                if np.all(np.array(entities)):
                    entity_list.append(np.ones(np.array(entities).shape))
                else:
                    # (np.array([1-e for e in entities])) # flip
                    entity_list.append(np.array(entities))
                sentence_labels.append(polarity)

            if (not ready) and ((i + 1) % batch_size == 0):
                ready = True # size-wise is ready for the next batch

            if ready and tmp_data_size > 0 and len(set(sentence_labels)) > 1:
                neg_v = np.random.choice(self.sample_table, size=(tmp_data_size, self.neg_sample_size))

                task3_labels = np.array(sentence_labels)
                task3_labels = np.maximum(np.zeros(task3_labels.shape), task3_labels)

                yield (self.to_device(np.array(pos_u)), self.to_device(np.array(pos_v)), self.to_device(neg_v)), \
                        (self.padding(sentence, entity_list), self.to_device(sentence_labels), self.to_device(task3_labels)) # if changed to entity-polarity only, we need an extra mask here
                pos_u = list()
                pos_v = list()
                sentence = list()
                entity_list = list()
                sentence_labels = list()
                ready = False

    def sample_lines(self, lines, entities):
        user_data = None
        sentence = list()
        entity_list = list()
        for line, ent in zip(lines, entities):
            line_index = self.dataset.sentence2indexes(line)
            # all_zeros = not np.any(line_index)
            if self.is_valid_sentence(line_index, ent):
                sentence.append(np.array(line_index))
                entity_list.append(np.array(ent))
        user_data = (None, (self.padding(sentence, entity_list), None, None)) if len(sentence) else None
        return user_data

    def mask_entities(self, padded, entities):
        return torch.transpose((entities == 0), 0, 1)
    def mask_align(self, padded, entities):
        return torch.transpose((padded == 0), 0, 1)
    def is_valid_sentence_basic(self, row, entities):
        return sum(row) != 0
    def is_valid_sentence_entities(self, row, entities):
        return sum(row) != 0 and sum(entities) != 0

    def pad(self, s, length):
        # print(self.dataset.idx2sentence(s))
        return torch.LongTensor(np.concatenate([s, np.zeros(length - len(s))]))

    def padding(self, sentences, entity_list):
        lengths = [len(s) for s in sentences]
        maxleng = max(lengths)
        padded = torch.stack([self.pad(s, maxleng) for s in sentences], dim=1)
        entities = torch.stack([self.pad(e, maxleng) for e in entity_list], dim=1)

        masked = self.masking(padded, entities)

        return self.keep_type(padded), self.keep_type(masked)





