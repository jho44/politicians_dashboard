import itertools
import random
import torch
import numpy as np
import os
import pandas as pd
from nltk.tokenize import MWETokenizer

import re
import string
# https://pypi.org/project/demoji/
import demoji
# demoji.download_codes()

def use_cuda():
    return torch.cuda.is_available()

def set_cuda(gpu_id):
    # set current device
    # we use single GPU only
    device = torch.device('cuda:{}'.format(gpu_id))
    torch.cuda.set_device(device)
    # model = nn.DataParallel(model).cuda() # multi-GPU

def print_cuda_info(gpu_id):
    # torch.cuda.get_device_name(0)
    # setting device on GPU if available, else CPU
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print('Using device:', device)
    print()
    # device.type == 'cuda'
    """
    # torch.cuda.max_memory_cached(device=None)
    # Returns the maximum GPU memory managed by the caching allocator in bytes for a given device.
    # torch.cuda.memory_allocated(device=None)

    print('\tGPU in use: ', torch.cuda.get_device_name(gpu_id))
    print('\tMemory Usage:')
    print("\t\tTotal Mem:", round(torch.cuda.get_device_properties(0).total_memory/1024**3,1), 'GB')
    print('\t\tAllocated:', round(torch.cuda.memory_allocated(gpu_id)/1024**3,1), 'GB')
    print('\t\tCached:   ', round(torch.cuda.memory_reserved(gpu_id)/1024**3,1), 'GB')

def list_available_cuda():
    return list(range(torch.cuda.device_count()))

def fix_random_seeds(seed):
    torch.manual_seed(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.cuda.manual_seed(seed)

def warning(message):
    print("WARNING: {}".format(message))

def error(message):
    print("ERROR: {}".format(message))
    exit(0)

def debug(*message):
    print("DEBUG: {}".format(message))
    exit(0)

# ordinary operations
def flatten2d(list2d):
    return list(itertools.chain(*list2d))

def flatten3d(list3d):
    return flatten2d(flatten2d(list3d))

def flip(weight):
    '''
    draw the true / false value according to a given weight
    '''
    tmp_rd = random.random()
    return tmp_rd <= weight

#########################################

data_repository = "./api/code_inference/"

auto_phrase_file = "AutoPhrase_multi-words.txt"
auto_phrase_path = os.path.join(data_repository, auto_phrase_file)

phrase_segments = list()
phrase_threshold = 0.8

re_url = re.compile(r'^(http|https)?:\/\/.*[\r\n]*', re.MULTILINE|re.UNICODE)
punctuations = string.punctuation.replace("#", '')
punctuations = punctuations.replace("@", '')
punctuations += "“”‘’"

if os.path.exists(auto_phrase_path):
    df = pd.read_csv(auto_phrase_path, sep="\t", header=None)
    for confidence, phrase in zip(df[0], df[1]):
        tmp_phrase_seg = tuple(phrase.split())
        if confidence > phrase_threshold:
            if len(tmp_phrase_seg) > 1:
                phrase_segments.append(tmp_phrase_seg)
            else: break
else:
    print("file {} not exists".format(auto_phrase_path))
    exit(0)

# Create a reference variable for Class MWETokenizer
tk = MWETokenizer(mwes=phrase_segments, separator='\x01')

def get_phrase(line):
    # debug case
    # line = "🕧♦️🇦🇱♥️🕢♥️👁‍🗨♦️🕤♠️🔙🔵🔡↖️↖️*️⃣↪️🇻🇨🇼🇫🇻🇨🇸🇿🇺🇸"
    line_split = [clean_word(w) for w in line.split()]
    line_split = [w for w in line_split if len(w)]
    if len(line_split) == 0:
        return []
    line_parse = tk.tokenize(line_split)
    return line_parse

def remove_punctuation(s):
    # print(string.punctuation)
    need_removal = len(s) and (s[0] in punctuations or s[-1] in punctuations)
    return s.translate(str.maketrans('','', punctuations)) if need_removal else s

def parse_emoji(s):
    # https://github.com/PatriciaXiao/socialmediaparse/blob/master/emoji_parse.py
    return list(demoji.findall(s).keys())

def clean_word(single_word):
    # special case:
    if single_word.lower() == "&amp;":
        return "" # &
    # single_word = "" if single_word == "RT" else single_word
    single_word = re_url.sub("", single_word)
    # single_word = "" if len(single_word) and (single_word[0] == "@" or single_word[-1] == "…") else single_word
    single_word = single_word[:-1] if (len(single_word) and single_word[-1] == "…") else single_word
    # single_word = single_word.lower() # might affect some emoji
    single_word = remove_punctuation(single_word)
    single_word = single_word.strip()
    single_word = single_word.replace("“", "\"")
    single_word = single_word.replace("”", "\"")
    single_word = single_word.replace("‘", "'")
    single_word = single_word.replace("’", "'")

    if len(single_word) and single_word[0] not in ["@"]: # do lower-case for hashtags "#..." as well
        emojis = parse_emoji(single_word)
        if len(emojis):
            try:
                deliminators = "({})".format("|".join(emojis)) # with (), the deliminators are also kept
                all_text = remove_empty_entities(re.split(deliminators, single_word))
                single_word = " ".join([t[0] if t in emojis else t.lower() for t in all_text])
            except:
                single_word = " ".join(emojis)
        else:
            single_word = single_word.lower()
    return single_word

def process_raw_tweet(tweet_content_raw):
    tokens = get_phrase(tweet_content_raw)
    tweet_content = " ".join(tokens)
    return tweet_content, tokens

def find_hashtags(tweet):
    tags = re.findall(r"#(\w+)", s)
    return ["#{}".format(t) for t in tags]

# tweet_content, _ = process_raw_tweet(tweet_content_raw)
