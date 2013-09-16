#!/usr/bin/env python2
# -*- coding: utf-8 -*-

import solace
import random
import time

NUM_RUNS = 2
NUM_STEPS = 20
PARAM1 = 5.3
PARAM2 = [ 5, 4, 2 ]
PARAM3 = False
PARAM4 = 'fox'
PARAM5 = {'foo': 'bar', 'list': [3, 2, 1]}

def step(var1, var2):
    var1 += random.uniform(0,1)
    var2 += random.uniform(0,1.5)

    time.sleep(5)

    return var1, var2

if __name__=="__main__":
    exp = solace.get_experiment('solace://lys:3000/test', 'admin', 'a0358070')
    inst = exp.create_instance(NUM_RUNS, {'PARAM1': PARAM1, 'PARAM2': PARAM2, 'PARAM3': PARAM3, 'PARAM4': PARAM4, 'PARAM5': PARAM5, 'NUM_STEPS': NUM_STEPS})

    for run in inst.runs:
        run.begin()

        # the variables we are optimizing (just as an example)
        var1 = 0
        var2 = 0

        current_step = 0
        while current_step < NUM_STEPS:
            var1, var2 = step(var1, var2)

            current_step += 1
            run.progress(current_step / float(NUM_STEPS), {'var1': var1, 'var2': var2})

        run.done({'var1': var1, 'var2': var2})