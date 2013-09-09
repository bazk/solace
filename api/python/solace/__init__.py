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
import json
import requests

class Run(object):
    pass

class Instance(object):
    def __init__(self, experiment, instance_id):
        self.id = instance_id
        self.experiment = experiment

class Experiment(object):
    def __init__(self, api_url, experiment_id, username, password):
        self.api_url = api_url
        self.id = experiment_id
        self.username = username
        self.password = password

        self.cookies = self.__login()

        r = requests.get(self.api_url+'/experiment/'+self.id, cookies=self.cookies)

        res = None
        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error.')

        self.name = res['name']
        self.description = res['description']
        self.created_at = res['created_at']

    def __login(self):
        r = requests.post(self.api_url+'/sessions', data={'username': self.username, 'password': self.password})

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at login.')

        return r.cookies

    def create_instance(parameters):
        r = requests.post(self.api_url+'/instances', data={'parameters': parameters}, cookies=self.cookies)

        if r.status_code != 200:
            try:
                res = r.json()
                raise Exception(res['error']) # TODO: translate error "key" into a user friendly message
            except:
                raise Exception('Unknown error at instance creation.')

        res = r.json()
        instance_id = res['id']
        return Instance(self, instance_id)

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

    