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

    // basic group operations
    {
      name:'add_g1',
      pattern: 'make:group',
      params: {owner_id:'o0', group:{name:'Group One', mark:'a'}},
      out: {group:{mark:'a', name: 'Group One'}}
    },    
    {
      pattern: 'amend:group',
      params: {id:'`$.g1 = $.add_g1.out.group.id`', group:{name:'The One Group'}},
      out: {group:{mark:'a', name:'The One Group'}}
    },    
    {
      pattern: 'get:group',
      params: {id:'`$.g1`', owners:true},
      out: {group:{mark:'a', name:'The One Group'}}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {items:[{mark:'a'}]}
    },    

    // unique groups

    {
      name:'add_g2',
      pattern: 'make:group',
      params: {owner_id:'o0',
               group:{name:'Group Two', mark:'b', code:'staff'},
               unique:true},
      out: {group:{mark:'b', name: 'Group Two'}}
    },    
    {
      pattern: 'get:group',
      params: {id:'`$.g2 = $.add_g2.out.group.id`'},
      out: {group:{mark:'b'}}
    },    
    {
      pattern: 'get:group',
      params: {owner_id:'o0', code:'staff'},
      out: {group:{mark:'b'}}
    },

// TODO: fix seneca-msg-test so it can handle this
    /*
    {
      pattern: 'make:group',
      params: {owner_id:'o0',
               group:{name:'Group Two Bad', mark: 'bbad', code:'staff'}},
      err: {}
    },    
*/

    // single and multiple owners
    
    {
      name:'add_g3',
      pattern: 'make:group',
      params: {owner_id:'o1', group:{name:'Group Three', mark:'c'}},
      out: {group:{mark:'c', name: 'Group Three'}}
    },    
    {
      pattern: 'add:group',
      params: {id:'`$.g3 = $.add_g3.out.group.id`', owner_id:'o2'},
      out: {}
    },    

    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {items:[{mark:'a'},{mark:'b'}]}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o1'},
      out: {items:[{mark:'c'}]}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o2'},
      out: {items:[{mark:'c'}]}
    },    

    {
      pattern: 'list:group-owner',
      params: {id:'`$.g1`'},
      out: {}
    },    
    {
      pattern: 'list:group-owner',
      params: {id:'`$.g2`'},
      out: {}
    },    
    {
      pattern: 'list:group-owner',
      params: {id:'`$.g3`'},
      out: {}
    },    

/*
    {
      pattern:'role:mem-store,cmd:dump',
      params:{},
      out:{}
    },
  */  

    // remove group
    {
      pattern: 'remove:group',
      params: {id:'`$.g1`', owner_id:'o0'},
      out: {owner_id:'o0'}
    },    
    {
      pattern: 'list:group',
      params: {owner_id:'o0'},
      out: {items:[
        {mark:'b', name:'Group Two'}]}
    },

    // add user to group
    {
      pattern: 'add:user',
      params: {user_id:'u0', group_id:'`$.g2`'},
      out: {}
    },    
    {
      pattern: 'list:user',
      params: {group_id:'`$.g2`'},
      out: {items:[{id:'u0'}]}
    },    
    {
      pattern: 'add:user',
      params: {user_id:'u1', group_id:'`$.g2`'},
      out: {}
    },    
    {
      pattern: 'list:user',
      params: {group_id:'`$.g2`'},
      out: {items:[{id:'u0'},{id:'u1'}]}
    },    

    // users groups    
    {
      pattern: 'list:user-group',
      params: {user_id:'u0'},
      out: {items:[{mark:'b'}]}
    },    
    {
      pattern: 'add:user',
      params: {user_id:'u1', group_id:'`$.g3`'},
      out: {}
    },    
    {
      pattern: 'list:user-group',
      params: {user_id:'u1'},
      out: {items:[{mark:'b'},{mark:'c'}]}
    },    
    {
      pattern: 'list:user-group',
      params: {user_id:'u1',owner_id:'o0'}, // only g2 is in o0
      out: {items:[{mark:'b'}]}
    },    

    {
      pattern: 'is:user-group-owner',
      params: {user_id:'u1',owner_id:'o0',owner_code:'d0'},
      out: {}
    },    

    
    // remove user from group
    {
      pattern: 'remove:user',
      params: {user_id:'u1',group_id:'`$.g3`'},
      out: {}
    },    
    {
      pattern: 'list:user-group',
      params: {user_id:'u1'},
      out: {items:[{mark:'b'}]}
    },    

  ]
}

