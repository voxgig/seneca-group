/* Copyright (c) 2018-2020 voxgig and other contributors, MIT License */
'use strict'

// sys/user is used to represent organisations - this allows business
// logic to build on other sys/user plugins.  Groups can be in more
// than one organization (hence the use of seneca-member), although
// this is not the primary use-case. Multi-organisation groups can be
// used for inter-organization collaboration, as shared permissions
// can be assigned to the group.

const SYS_GROUP_SV = 0

module.exports = group
module.exports.defaults = {
  test: false,
  kinds: {
    grpown: {
      p: 'sys/user', // assumes orgs are a special kind of user
      c: 'sys/group'
    },
    usrgrp: {
      p: 'sys/group',
      c: 'sys/user'
    }
  }
}

function group(opts) {
  const seneca = this
  const Joi = seneca.util.Joi

  function define_patterns() {
    seneca
      .message('role:group,make:group', make_group) // Create a group
      .message('role:group,amend:group', amend_group) // Update group fields
      .message('role:group,get:group', get_group) // Load group
      .message('role:group,add:group', add_group) // Add group to owner
      .message('role:group,list:group', list_group) // List group by owner
      .message('role:group,list:group-owner', list_group_owner) // List owner by group
      .message('role:group,remove:group', remove_group) // Remove group from owner
      // TODO: retire_group to delete entity
      // TODO: move_group to another owner

      .message('role:group,add:user', add_user)
      .message('role:group,remove:user', remove_user)
      .message('role:group,list:user', list_user)
      .message('role:group,list:user-group', list_user_group)
      .message('role:group,is:user-group-owner', is_user_in_group_for_owner)

      .prepare(async function() {
        await this.post('role:member,add:kinds', { kinds: opts.kinds })
      })
  }

  make_group.validate = {
    owner_id: Joi.string().required(),
    group: Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      tags: Joi.array().items(Joi.string())
    })
      .unknown()
      .required(),
    unique: Joi.boolean()
  }

  async function make_group(msg) {
    const owner_id = msg.owner_id
    const fields = msg.group || {}
    const unique = !!msg.unique

    fields.merge$ = true
    fields.sv = SYS_GROUP_SV

    var existing = await intern.find_group(this, {
      owner_id: owner_id,
      code: fields.code
    })

    if (existing && existing.unique) {
      return { group: existing, exists: true }
    }

    var group = this.entity('sys/group')

    // Unique group means unique over (code,owner_id)
    // TODO: ensure owner_id defined
    if (unique && null != fields.code) {
      group =
        (await group.load$({ code: fields.code, owner_id: owner_id })) || group
      fields.owner_id = owner_id
      fields.unique = true
    }

    group = await group.data$(fields).save$()

    await this.post('role:member,add:member', {
      kind: 'grpown',
      parent: owner_id,
      child: group.id,
      code: fields.code,
      tags: fields.tags
    })

    return { group: group, created: true }
  }

  amend_group.validate = {
    id: Joi.string(),
    owner_id: Joi.string(),
    code: Joi.string(),
    group: Joi.object({
      name: Joi.string(),
      tags: Joi.array().items(Joi.string())
    })
      .unknown()
      .required()
  }

  // Only changes fields, not owner, or uniqueness
  async function amend_group(msg) {
    var group = await intern.find_group(this, msg)

    if (group) {
      const fields = msg.group || {}

      // These determine uniqueness so cannot be altered
      delete fields.unique
      delete fields.code
      delete fields.owner_id

      fields.merge$ = true
      fields.sv = SYS_GROUP_SV

      group = await group.data$(fields).save$()

      // update tags in membership relations
      if (fields.tags) {
        const items = (
          await this.post('role:member,list:parents', {
            as: 'member',
            kind: 'grpown',
            child: group.id
          })
        ).items

        for (var i = 0; i < items.length; i++) {
          items[i].tags = fields.tags
          await items[i].save$()
        }
      }
    }

    return { group: group }
  }

  get_group.validate = {
    id: Joi.string(),
    owner_id: Joi.string(),
    code: Joi.string()
  }

  async function get_group(msg) {
    const include_owners = !!msg.owners

    const group = await intern.find_group(this, msg)
    const out = { group: group }

    if (group && include_owners) {
      out.owners = (
        await this.post('role:member,list:parents', {
          as: 'parent-id',
          kind: 'grpown',
          child: group.id
        })
      ).items
    }

    return out
  }

  add_group.validate = {
    id: Joi.string().required(),
    owner_id: Joi.string().required(),
    code: Joi.string(),
    tags: Joi.array().items(Joi.string())
  }

  async function add_group(msg) {
    const group_id = msg.id
    const owner_id = msg.owner_id

    const out = { added: false, id: group_id, owner_id: owner_id }

    const owners = (
      await this.post('role:member,list:parents', {
        as: 'parent-id',
        kind: 'grpown',
        child: group_id
      })
    ).items

    if (!owners.includes(owner_id)) {
      var group = this.entity('sys/group').load$({
        id: group_id,
        fields$: ['code', 'tags']
      })

      if (group) {
        await this.post('role:member,add:member', {
          kind: 'grpown',
          parent: owner_id,
          child: group_id,

          // NOTE: copied from group
          code: group.code,
          tags: group.tags
        })

        out.added = true
      }
    }

    return out
  }

  remove_group.validate = {
    id: Joi.string().required(),
    owner_id: Joi.string().required()
  }

  async function remove_group(msg) {
    const group_id = msg.id
    const owner_id = msg.owner_id

    if (null != owner_id) {
      await this.post('role:member,remove:member', {
        kind: 'grpown',
        parent: owner_id,
        child: group_id
      })
    }

    return { id: group_id, owner_id: owner_id }
  }

  list_group.validate = {
    owner_id: Joi.string().required(),
    code: Joi.string()
  }

  async function list_group(msg) {
    // TODO: validate, owner_id is required
    const owner_id = msg.owner_id
    const code = msg.code

    const group_list = await this.post('role:member,list:children', {
      as: 'child',
      kind: 'grpown',
      parent: owner_id,
      code: code
    })

    return { items: group_list.items }
  }

  list_group_owner.validate = {
    id: Joi.string().required(),
    as: Joi.string()
  }

  async function list_group_owner(msg) {
    const group_id = msg.id
    const as = msg.as || 'parent-id'

    const group_list = await this.post('role:member,list:parents', {
      as: as,
      kind: 'grpown',
      child: group_id,
      code: msg.code
    })

    return { items: group_list.items }
  }

  add_user.validate = {
    user_id: Joi.string().required(),
    group_id: Joi.string().required(),
    code: Joi.string(),
    tags: Joi.array().items(Joi.string())
  }

  async function add_user(msg) {
    const user_id = msg.user_id
    const grp_id = msg.group_id

    const member = await this.post('role:member,add:member', {
      parent: grp_id,
      child: user_id,
      kind: 'usrgrp',
      code: msg.code,
      tags: msg.tags
    })

    return member
  }

  remove_user.validate = {
    user_id: Joi.string().required(),
    group_id: Joi.string().required(),
    code: Joi.string()
  }

  async function remove_user(msg) {
    const user_id = msg.user_id
    const grp_id = msg.group_id

    const member = await this.post('role:member,remove:member', {
      parent: grp_id,
      child: user_id,
      kind: 'usrgrp',
      code: msg.code
    })

    return { member: member }
  }

  list_user.validate = {
    group_id: Joi.string().required(),
    code: Joi.string()
  }

  async function list_user(msg) {
    const grp_id = msg.group_id

    const user_list = await this.post('role:member,list:children', {
      as: 'child',
      kind: 'usrgrp',
      parent: grp_id,
      code: msg.code
    })

    return { items: user_list.items }
  }

  list_user_group.validate = {
    user_id: Joi.string().required(),
    owner_id: Joi.string(),
    code: Joi.string()
  }

  async function list_user_group(msg) {
    const user_id = msg.user_id
    const owner_id = msg.owner_id

    var group_query = {
      child: user_id,
      as: 'parent',
      kind: 'usrgrp'
    }

    // TODO: should this be here?
    if (null != msg.code) {
      group_query.code = msg.code
    }

    const group_list = await this.post('role:member,list:parents', group_query)

    //console.log('GROUP LIST A',owner_id,group_query,group_list.items)
    //console.dir(group_list)

    if (owner_id) {
      /*
        var items = []

      // TODO: needs to be optimized, as users groups will grow over time
      // and some users will end up in thousands of groups
      for(var i = 0; i < group_list.items.length; i++) {
        var group = group_list.items[i]

        if(null == msg.kind || group.kind === msg.kind) {

          // TODO: support a `children` arg to pass list of ids
          var out = await this.post('role:member,is:member', {
            parent: owner_id, child: group.id, kind: 'grpown', code: msg.owner_code
          })

          if(out.member) {
            items.push(group)
          }
        }
      }

      group_list.items = items
      */

      var out = await this.post('role:member,is:member', {
        parent: owner_id,
        children: group_list.items.map(g => g.id),
        kind: 'grpown',
        code: msg.owner_code
      })

      // only keep groups that are members of owner_id
      group_list.items = out
        .filter(r => r.member)
        .map(r => group_list.items.find(g => g.id === r.member.c))
    }

    //console.log('GROUP LIST B',group_list.items)

    return { items: group_list.items }
  }

  list_user_group.validate = {
    user_id: Joi.string().required(),
    owner_id: Joi.string(),
    owner_code: Joi.string(),
    group_id: Joi.string(),
    group_code: Joi.string()
  }

  async function is_user_in_group_for_owner(msg) {
    const user_id = msg.user_id
    var grp_id = msg.group_id
    const grp_code = msg.group_code
    const owner_code = msg.owner_code
    const owner_id = msg.owner_id

    // var group = null

    // Picks first group with given code
    if (null == grp_id && null != owner_code && null != owner_id) {
      var owner_member = (
        await this.post('role:member,is:member', {
          as: 'child',
          parent: owner_id,
          code: owner_code
        })
      ).member

      grp_id = owner_member && owner_member.c
    }

    var member = null

    if (grp_id) {
      member = (
        await this.post('role:member,is:member', {
          parent: grp_id,
          child: user_id
        })
      ).member
    }

    return {
      member: member,
      user_id: user_id,
      group_id: grp_id,
      group_code: grp_code,
      owner_code: owner_code,
      owner_id: owner_id
    }
  }

  return define_patterns()
}

const intern = (module.exports.intern = {
  find_group: async function(seneca, msg) {
    const q = {}

    if (null != msg.id) {
      q.id = msg.id
    }

    // NOTE: both needed to preserve code uniquness of group within owner
    else if (null != msg.owner_id && null != msg.code) {
      q.owner_id = msg.owner_id
      q.code = msg.code
    } else {
      return null
    }

    return await seneca.entity('sys/group').load$(q)
  }
})
