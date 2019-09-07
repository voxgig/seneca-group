/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

const Util = require('util')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const lab = (exports.lab = Lab.script())
const expect = Code.expect

const SenecaMsgTest = require('seneca-msg-test')
const PluginValidator = require('seneca-plugin-validator')
const Seneca = require('seneca')
const Plugin = require('..')


lab.test('validate', PluginValidator(Plugin, module))

lab.test('member-kinds', () => {
  return new Promise((fin) => {
    seneca_instance(fin)
      .act('role:member,get:kinds', function(err, out) {
        expect(out).includes({
          kinds: {
            grpown: { p: 'sys/user', c: 'sys/group' },
            usrgrp: { p: 'sys/group', c: 'sys/user' } } })
        fin()
      })
  })
})

lab.test(
  'group-msgs',
  SenecaMsgTest(seneca_instance(), require('./msg-spec.js'))
)

function seneca_instance(fin, testmode) {
  return Seneca()
    .test(fin, testmode)
    .use('promisify')
    .use('seneca-joi')
    .use('entity')
    .use('member')
    .use(Plugin)
}
