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

"""
Setup script for solace python api.

Read INSTALL for instructions.
"""

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

setup(name='solace-api-python',
      version='0.2.1',
      description='Python API for the Solace framework',
      license='GPLv3',
      author='Eduardo L. Buratti',
      author_email='eburatti09@gmail.com',
      url='http://github.com/eburatti09/solace',
      download_url='http://github.com/eburatti09/solace',
      packages=['solace'],
      scripts=[],
      test_suite='tests',
      install_requires=[]
     )
