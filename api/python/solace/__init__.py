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
    if params is None:
        return json.dumps([])

    ret = []
    for key,val in params.iteritems():
        if isinstance(val, str):
            param_type = 'string'
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
        return 'ExperimentInstanceRun<%s,%s>' % (self.instance.id,str(self.id))

    def begin(self):
        r = requests.post(self.experiment.api_url+'/'+self.instance.id+'/'+str(self.id)+'/begin', cookies=self.experiment.cookies, verify=False)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

    def progress(self, progress, partial_results=None):
        if (progress > 1) or (progress < 0):
            raise Exception('Invalid value for progress.')

        r = requests.post(self.experiment.api_url+'/'+self.instance.id+'/'+str(self.id),
                          data={
                            'progress': progress,
                            'results': parse_params(partial_results)
                          },
                          cookies=self.experiment.cookies,
                          verify=False)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

    def done(self, results=None):
        r = requests.post(self.experiment.api_url+'/'+self.instance.id+'/'+str(self.id)+'/done',
                          data={
                            'results': parse_params(results)
                          },
                          cookies=self.experiment.cookies,
                          verify=False)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

    def cancel(self):
        r = requests.post(self.experiment.api_url+'/'+self.instance.id+'/'+str(self.id)+'/cancel', cookies=self.experiment.cookies, verify=False)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at posting progress.')

    def upload(self, path, filename='unnamed'):
        r = requests.post(self.experiment.api_url+'/'+self.instance.id+'/'+str(self.id)+'/upload',
                          files={
                            'file': (filename, open(path, 'rb'))
                          },
                          cookies=self.experiment.cookies,
                          verify=False)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error uploading file.')

class Instance(object):
    def __init__(self, experiment, instance_id):
        self.id = instance_id
        self.experiment = experiment
        self.runs = []

    def __repr__(self):
        return 'ExperimentInstance<%s>' % (self.id,)

    def set_runs(self, runs):
        self.runs = runs

class Experiment(object):
    def __init__(self, api_url, experiment_name, cookies):
        self.api_url = api_url
        self.name = experiment_name
        self.cookies = dict(cookies)

        r = requests.get(self.api_url, cookies=self.cookies, verify=False)

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

    def create_instance(self, num_runs, parameters, code_version=None):
        data = {
            'num_runs': num_runs,
            'parameters': parse_params(parameters)
        }
        if code_version:
            data['code_version'] = code_version

        r = requests.post(self.api_url,
                          data=data,
                          cookies=self.cookies,
                          verify=False)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at instance creation.')

        res = r.json()
        instance = Instance(self, res['id'])
        runs = [ Run(instance, i) for i in range(1,num_runs+1) ]
        instance.set_runs(runs)
        return instance

def get_experiment(uri, username, password):
    """ URI in the form: solace://hostname[:port]/experiment_name """

    m = re.match(r"solace://(?P<hostname>[a-zA-Z0-9_\-\.]+)(:(?P<port>[0-9]+))?/(?P<experiment_name>[a-zA-Z0-9-_]+)", uri)

    if not m:
        raise Exception('Invalid experiment URI')

    hostname = m.group('hostname')
    port = m.group('port') or 443
    experiment_name = m.group('experiment_name')
    api_url = 'https://%s:%s/api/e/%s' % (hostname, port, experiment_name)

    r = requests.post('https://%s:%s/api/s' % (hostname, port), data={'username': username, 'password': password}, verify=False)
    if r.status_code != 200:
        try:
            res = r.json()
            raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
        except:
            raise Exception('Unknown error at login.')

    return Experiment(api_url, experiment_name, r.cookies)
