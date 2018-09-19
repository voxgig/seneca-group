/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

const Optioner = require('optioner')
const Joi = Optioner.Joi

module.exports = {
  print: true,
  test: true,
  log: false,
  data: JSON.stringify(require('./data.js')),
  fix: 'role:group',
  context: {},
  calls: [

    // add some groups
    {
      name:'add-g1',
      pattern: 'amend:group',
      params: {owner_id:'o0', group:{name:'Group One', mark:'a'}},
      out: {ok: true, group:{mark:'a', name: 'Group One'}}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {ok:true, list:[{mark:'a'}]}
    },
    {
      name:'add-g2',
      pattern: 'amend:group',
      params: {owner_id:'o0', group:{name:'Group Two', mark:'b'}},
      out: {ok: true, group:{mark:'b'}}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {ok:true, list:[{mark:'a'},{mark:'b'}]}
    },

    // edit group
    {
      pattern: 'amend:group',
      params: {id:'`add-g1:out.group.id`', group:{name:'The One Group'}},
      out: {ok: true, group:{mark:'a', name:'The One Group'}}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {ok:true, list:[
        {mark:'a', name:'The One Group'},
        {mark:'b', name:'Group Two'}]}
    },


    // remove group
    {
      pattern: 'amend:group',
      params: {id:'`add-g1:out.group.id`', remove:true},
      out: {ok: true, group:{mark:'a', name:'The One Group'}}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {ok:true, list:[
        {mark:'b', name:'Group Two'}]}
    },

    // add user to group
    {
      pattern: 'add:user',
      params: {user_id:'u0', group_id:'`add-g1:out.group.id`'},
      out: {}
    },    
    {
      pattern: 'list:user',
      params: {group_id:'`add-g1:out.group.id`'},
      out: {items:[{id:'u0'}]}
    },    
    {
      pattern: 'add:user',
      params: {user_id:'u1', group_id:'`add-g1:out.group.id`'},
      out: {}
    },    
    {
      pattern: 'list:user',
      params: {group_id:'`add-g1:out.group.id`'},
      out: {items:[{id:'u0'},{id:'u1'}]}
    },    


    // multi-owner group
    {
      name:'add-g3o2',
      pattern: 'amend:group',
      params: {owner_id:'o2', group:{name:'Group Three', mark:'c'}},
      out: {ok: true, group:{mark:'c'}}
    },    

    {
      name:'add-g3o3',
      pattern: 'amend:group',
      params: {owner_id:'o3', id:'`add-g3o2:out.group.id`'},
      out: {ok: true, group:{mark:'c'}}
    },    
    {
      pattern: 'list:group-owner',
      params: {id:'`add-g3o2:out.group.id`'},
      out: {items:[{id:'o2'},{id:'o3'}]}
    },    


    
    {
      pattern: 'list:user-group',
      params: {user_id:'u1'},
      out: {}
    },    

    {
      pattern: 'list:user-group',
      params: {user_id:'u1'},
      out: {}
    },    

    
    {
      pattern: 'remove:user',
      params: {},
      out: {}
    },    

  ]
}

