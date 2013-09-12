#!/usr/bin/env python2
# -*- coding: utf-8 -*-
#
# This file is part of solace-api-python.
#
# solace-api-python is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# solace-api-python is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with solace-api-python. If not, see <http://www.gnu.org/licenses/>.

import re
import requests
import json

def parse_params(params):
    ret = []
    for key,val in params.iteritems():
        if isinstance(val, str):
            param_type = 'str'
        elif isinstance(val, int):
            param_type = 'integer'
        elif isinstance(val, float):
            param_type = 'real'
        elif isinstance(val, bool):
            param_type = 'boolean'
        elif isinstance(val, list):
            param_type = 'list'
        elif isinstance(val, dict):
            param_type = 'dict'
        else:
            print 'Unknown parameter type, skipping...'
            continue

        ret.append({'name': key, 'value': str(val), 'type': param_type})

    return json.dumps(ret)

class Run(object):
    def __init__(self, instance, run_id):
        self.id = run_id
        self.instance = instance
        self.experiment = instance.experiment

    def __repr__(self):
        return 'ExperimentInstanceRun<%s>' % (str(self.id),)

    def progress(self, progress, partial_results=None):
        if (progress > 1) or (progress < 0):
            raise Exception('Invalid value for progress.')

        r = requests.post(self.experiment.api_url+'/run/'+str(self.id),
                          data={
                            'progress': progress,
                            'results': parse_params(partial_results)
                          },
                          cookies=self.experiment.cookies)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

    def done(self, results=None):
        r = requests.post(self.experiment.api_url+'/run/'+str(self.id)+'/done',
                          data={
                            'results': parse_params(results)
                          },
                          cookies=self.experiment.cookies)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

    def cancel(self):
        r = requests.post(self.experiment.api_url+'/run/'+str(self.id)+'/cancel', cookies=self.experiment.cookies)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

class Instance(object):
    def __init__(self, experiment, instance_id):
        self.id = instance_id
        self.experiment = experiment
        self.runs = []

    def __repr__(self):
        return 'ExperimentInstance<%s>' % (str(self.id),)

    def set_runs(self, runs):
        self.runs = runs

class Experiment(object):
    def __init__(self, api_url, experiment_id, username, password):
        self.api_url = api_url
        self.id = experiment_id
        self.username = username
        self.password = password

        self.cookies = self.__login()

        r = requests.get(self.api_url+'/experiment/'+self.id, cookies=self.cookies)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error.')

        res = r.json()
        self.name = res['name']
        self.description = res['description']
        self.created_at = res['created_at']

    def __repr__(self):
        return 'Experiment<%s, %s> (%s)' % (self.name, str(self.created_at), self.description)

    def __login(self):
        r = requests.post(self.api_url+'/sessions', data={'username': self.username, 'password': self.password})

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at login.')

        return r.cookies

    def create_instance(self, num_runs, parameters):
        r = requests.post(self.api_url+'/instances',
                          data={
                            'experiment': self.id,
                            'num_runs': num_runs,
                            'parameters': parse_params(parameters)},
                          cookies=self.cookies)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at instance creation.')

        res = r.json()
        instance = Instance(self, res['id'])
        runs = [ Run(instance, run['id']) for run in res['runs'] ]
        instance.set_runs(runs)
        return instance

def get_experiment(uri, username, password):
    """ URI in the form: solace://hostname[:port]/experiment_id """

    m = re.match(r"solace://(?P<hostname>[a-zA-Z0-9_\-\.]+)(:(?P<port>[0-9]+))?/(?P<experiment_id>[a-zA-Z0-9]+)", uri)

    if not m:
        raise Exception('Invalid experiment URI')

    hostname = m.group('hostname')
    port = m.group('port') or 80
    api_url = 'http://%s:%s/api' % (hostname, port)
    experiment_id = m.group('experiment_id')

    return Experiment(api_url, experiment_id, username, password)