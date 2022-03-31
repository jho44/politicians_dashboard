import argparse

from task_manager import create_task_manager

'''
watch -n0.1 nvidia-smi

python main.py -m 3 -t task3_withent

'''

if __name__ == "__main__":

    print("This is not the most recent version of our code\nThe most recent version of our code is kept confidential until paper is accepted\nThanks for your understanding")

    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--embedding_size', '-emb', default=200, type=int,
                        help='the embedding size')
    parser.add_argument('--n_epoch', '-ne', default=3, type=int,
                        help='the number of maximum training epochs')
    parser.add_argument('--batch_size', '-bs', default=16, type=int,
                        help='the number of tweets per batch')
    parser.add_argument('--window_size', '-ws', default=1, type=int,
                        help='the window size of neighborhood sampling')
    parser.add_argument('--learning_rate', '-lr', default=0.8, type=float,
                        help='the initialize learning rate')
    parser.add_argument('--basic_model', '-bm', default="skipgram", type=str, choices=["skipgram"],
                        help='the embedding size')
    parser.add_argument('--test_name', '-t', default="task3_withent", type=str,
                        help='the folder name to store the result files')
    parser.add_argument('--lambda_D', '-lD', default=0.1, type=float,
                        help='the lambda of D')
    parser.add_argument('--fixed_seed', '-seed', default=1, type=int, # default could be None
                        help='the random seed fixed')
    parser.add_argument('--mode', '-m', default=3, type=int,
                        help='which variation to use (1 for task 1 only; 2 for task 1 and 2 only; 3 for task 1, 2 and 3)')
    parser.add_argument('-mm', '--mask_mode', default="entities", type=str, choices=["entities", "align"],
                        help='which mode we use for masking off the tokens within a sentence (default: entities)')
    parser.add_argument('--gpu_id', '-gid', default=0, type=int,
                        help='the id of the gpu we use (default: 0)')

    args = parser.parse_args()

    task_manager = create_task_manager(args)
    task_manager.single_line_test(args.new_tweet)
