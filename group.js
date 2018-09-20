/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

// sys/user is used to represent organisations - this allows business
// logic to build on other sys/user plugins.  Groups can be in more
// than one organization (hence the use of seneca-member), although
// this is not the primary use-case. Multi-organisatin groups can be
// used for inter-organization collaboration, as shared permissions
// can be assigned to the group.


const Util = require('util')

const Optioner = require('optioner')
const Joi = Optioner.Joi

module.exports = group
module.exports.defaults = {
  test: false,
  kinds: {
    grpown: {
      p: 'sys/user',  // assumes orgs are a special kind of user
      c: 'sys/group',
    },
    usrgrp: {
      p: 'sys/group',
      c: 'sys/user'
    }
  }
}

function group(opts) {
  this
    .message('role:group,amend:group', amend_group)
    .message('role:group,list:group', list_group)
    .message('role:group,list:group-owner', list_group_owner)

    .message('role:group,add:user', add_user)
    .message('role:group,remove:user', remove_user)
    .message('role:group,list:user', list_user)
    .message('role:group,list:user-group', list_user_group)
    .message('role:group,is:user-group-owner', is_user_in_group_for_owner)
  
    .prepare(async function() {
      await this.post('role:member,add:kinds', {kinds: opts.kinds})
    })

  
  async function amend_group(msg) {
    var grp = null
    const grp_id = msg.id

    // NOTE: this deletes the group entirely; an additional option might to
    // remove the group from an org, but leave it in other orgs
    if(grp_id && msg.remove) {

      // As no parent is specified, the group is removed from all orgs
      await this.post('role:member,remove:member', {
        kind:'grpown',
        child:grp_id,
      })
      
      grp = await this.entity('sys/group').remove$({id: grp_id, load$:true})
    }
    else {
      // TODO: validate
      /*
      const grp_fields = {
        name: msg.group.name,
        owner_id: msg.group.owner_id
      }
      */
      const grp_fields = msg.group || {}

      if(grp_id) {
        grp_fields.id = grp_id
      }

      grp_fields.merge$ = true
      
      grp = await this.entity('sys/group').data$(grp_fields).save$()

      var m = await this.post('role:member,add:member', {
        kind:'grpown',
        parent:msg.owner_id,
        child:grp.id,
        code:msg.code,
        tags:msg.tags,
      })
    }
    
    return {group: grp}
  }

  
  async function list_group(msg) {
    // TODO: validate, owner_id is required

    const group_list = await this.post('role:member,list:children', {
      as:'child',
      kind:'grpown',
      parent:msg.owner_id,
      code:msg.code
    })

    return {items: group_list.items}
  }


  async function list_group_owner(msg) {
    const group_id = msg.id
    
    const group_list = await this.post('role:member,list:parents', {
      as:'parent',
      kind:'grpown',
      child:msg.id,
      code:msg.code
    })

    return {items: group_list.items}
  }
  

  async function add_user(msg) {
    const user_id = msg.user_id
    const grp_id = msg.group_id

    const member = await this.post('role:member,add:member', {
      parent: grp_id,
      child: user_id,
      kind: 'usrgrp',
      code: msg.code,
      tags: msg.tags,
    })
    
    return member
  }

  async function remove_user(msg) {
    const user_id = msg.user_id
    const grp_id = msg.group_id

    const member = await this.post('role:member,remove:member', {
      parent: grp_id,
      child: user_id,
      kind: 'usrgrp',
      code: msg.code,
    })
      
    return {member: member}
  }

  async function list_user(msg) {
    const grp_id = msg.group_id
    
    const user_list = await this.post('role:member,list:children', {
      as:'child',
      kind:'usrgrp',
      parent:msg.grp_id,
      code:msg.code
    })

    return {items: user_list.items}
  }

  async function list_user_group(msg) {
    const user_id = msg.user_id
    const owner_id = msg.owner_id
    
    const group_list = await this.post('role:member,list:parents', {
      child:user_id,
      as:'parent',
      kind:'usrgrp',
      code:msg.code
    })

    if(owner_id) {
      var items = []
      for(var i = 0; i < group_list.items.length; i++) {
        var group = group_list.items[i]
        var out = await this.post('role:member,is:member', {
          parent: owner_id, child: group.id, kind: 'grpown', code: msg.owner_code
        })

        if(out.member) {
          items.push(group)
        }
      }

      group_list.items = items
    }
    
    return {items: group_list.items}
  }


  async function is_user_in_group_for_owner(msg) {
    const user_id = msg.user_id
    var grp_id = msg.group_id
    const grp_code = msg.group_code
    const owner_code = msg.owner_code
    const owner_id = msg.owner_id

    var group = null

    // Picks first group with given code
    if( null == grp_id && null != owner_code && null != owner_id ) {
      var owner_member = (await this.post('role:member,is:member', {
        as: 'child',
        parent: owner_id,
        code: owner_code,
      })).member

      grp_id = owner_member && owner_member.c
    }

    var member = (await this.post('role:member,is:member', {
      parent: grp_id,
      child: user_id,
      //code: grp_code
    })).member

    return {
      member: member,
      user_id: user_id,
      group_id: grp_id,
      group_code: grp_code,
      owner_code: owner_code,
      owner_id: owner_id
    }
  }

}

