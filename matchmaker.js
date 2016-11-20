import { Mongo } from "meteor/mongo";
import { Meteor } from "meteor/meteor";
import { EJSON } from "meteor/ejson";
import { Random } from "meteor/random";
import { check, Match as Patterns } from "meteor/check";
import { 
  validateNew, 
  validateMethod } from "./validators.js";
import { 
  notFull, 
  withType, 
  withRequest,
  withoutRequest,
  withSpots } from "./filters.js";
import { 
  setInit, 
  setRoles,
  setMaxUsers,
  incUsers, 
  setRequest, 
  voidRequest, 
  updRequest, 
  setModified, 
  setEnded } from "./updates.js";


//implement archiving in updateMatch if opts.end

export default class Matchmaker {
  constructor(opts){
    validateNew(opts);
    if (opts.matchesCollection === opts.archiveCollection){
      throw new Meteor.Error('unique-archive',
        "Archive must be a different collection than Matches."
      )
    }
    //init the match-type defs (templates)
    this._types = {};
    opts.templates.forEach((def)=>{
      this._types[def.type] = def;
    })
    //init the callbacks, if desired
    this._onMatch = opts.onMatch && opts.onMatch.bind(this);
    //init the stores
    ["matches","archive"].forEach((c)=>{
      const coll = new Mongo.Collection(opts[c+"Collection"]);
      const r = coll.rawCollection();
      coll.findAndDelete = Meteor.wrapAsync(r.findOneAndDelete,r);
      coll.findAndModify = Meteor.wrapAsync(r.findAndModify,r);
      coll.createIndex = Meteor.wrapAsync(r.createIndex,r);
      this[c] = coll;
    })
    //apply recommended indexes, if desired
    if (opts.applyDefaultMatchesIndex){
      this._bgIndex(this.matches,{
        _type:1,
        _createdAt:1
      });
      if (!opts.playersToMatchesIsBijective){
        /*if we use a unique index on players.userId
          we don't need to do this, as there are no
          documents underneath the sort order of 
          players.userId, since it defines a single
          document.*/
        this._bgIndex(this.matches, {
          "players.userId":1,
          _type:1,
          "players.role":1,
        })
      }
    }
    if (opts.applyDefaultArchiveIndex){
      this._bgIndex(this.archive,{
        _type:1,
        _endedAt:1
      });
      this._bgIndex(this.archive,{
        "players.userId":1,
        _type:1,
        "players.role":1,
      })
    }
    //apply uniqueness index, if desired
    if (opts.playersToMatchesIsBijective){
      this._bgIndex(this.matches,
        {"players.userId":1},
        {unique:true,sparse:true}
      )
    }
  }
  _bgIndex(coll,fields,opts={}){
    coll.createIndex(fields,
      {background:true,...opts},
      ()=>{}
    )
  }
  _validate(origOpts, willEdit){
    /*make sure the origOpts are of the right format,
      and return a sanitized copy*/
    validateMethod(origOpts);
    const opts = EJSON.clone(origOpts);
    opts.type = this._types[opts.type];
    /*do a soft check on the type to make sure
      it's defined. we don't need to check the
      structure (was done in the constructor)*/
    check(opts.type, Object);
    opts.now = new Date();
    opts.match = opts.match || {};
    opts.fields = opts.fields || {};
    opts.matchUpdate = opts.matchUpdate || {};
    if (willEdit){
      /*willEdit is a list of $mongoSelectors;
        we don't want the dev to not be able to
        use their own $mongo fields, to prevent our
        fields from overriding, we predefine them*/
      opts.matchUpdate = {
        ...willEdit.reduce((p,c)=>{p[c]={}; return p},{}), 
        ...opts.matchUpdate
      };
    }
    return opts;
  }
  _archive(match,update){
    if (match){
      this.archive.findAndModify(
        match,{},update,
        {upsert:true,fields:{_id:1}},
        ()=>{}
      )
    }
    return match;
  }
  archiveMatch(origOpts,cb){
    //{match?,matchUpdate?,type},cb?
    check(cb, Patterns.Optional(Function));
    const o = this._validate(
      origOpts,["$set"]
    )
    const m = o.match;
    check(m, 
      Patterns.ObjectIncluding({_id:String})
    )
    const t = o.type;
    const u = o.matchUpdate;
    //filter sequence
    withType(m,t.type);
    //update sequence
    setEnded(u,o.now)
    const wrapCb = cb && ((err,res) =>{
      cb(err,res ? this._archive(res.value,u) : null);
    })
    const res = this.matches.findAndDelete(m,wrapCb);
    if (!wrapCb)
      return this._archive(res.value,u);
  }
  _checkFull(match,max){
    if (match && match._nPlayers === max){
      this._onMatch && this._onMatch(match);
    }
    return match;
  }
  enqueue(origOpts,cb){
    //{type,request,match?,matchUpdate?},cb?
    check(cb, Patterns.Optional(Function));
    check(origOpts.request, Object);
    const o = this._validate(
      origOpts,
      ["$set","$inc","$push","$setOnInsert"]
    )
    const r = o.request;
    const t = o.type;
    const m = o.match;
    const u = o.matchUpdate
    /*filter sequence to hone in
       on specific matches.*/
    withType(m,t.type);
    withSpots(m,r.role,t.roles[r.role]);
    if (!o.playersToMatchesIsBijective)
      withoutRequest(m,r.userId);
    /*update sequence to 
      modify the found match.*/
    setInit(u,o.now);
    setRoles(u,t.roles,r.role);
    setMaxUsers(u,t.max);
    incUsers(u,1)
    setRequest(u,r,o.now);
    /*call _checkFull to see if
      the last queued user is the user
      who ended up filling the match*/
    const wrapCb = cb && ((err,res) =>{
      cb(err,res ? this._checkFull(res.value,t.max) : null);
    })
    const res = this.matches.findAndModify(
      m,{_createdAt:1},u,
      {upsert:true,new:true,fields:o.fields},
      wrapCb
    );
    if (!wrapCb)
      return this._checkFull(res.value,t.max);
  }
  requeue(origOpts,cb){
    /*{type,requestUpdate,request,match?,
      matchUpdate?,force?},cb?*/
    check(cb, Patterns.Optional(Function));
    check(origOpts.request, Object);
    check(origOpts.requestUpdate, Object);
    const o = this._validate(
      origOpts,["$set","$inc"]
    );
    const r = o.request;
    const nr = o.requestUpdate;
    const t = o.type;
    const m = o.match;
    const u = o.matchUpdate;
    //filter sequence
    withType(m,t.type);
    //require userId,role
    withRequest(m,r);
    if (nr.role)
      withSpots(m,nr.role,t.roles[nr.role])
    else if (!o.force)
      notFull(m,t.max)
    //update sequence
    updRequest(u,nr,r.role,o.now);
    setModified(u,o.now);
    return this.matches.update(m,u,cb)
  }
  dequeue(origOpts,cb){
    /*{type,request,match?,
      matchUpdate?,force?},cb?*/
    check(cb, Patterns.Optional(Function));
    check(origOpts.request, Object)
    const o = this._validate(
      origOpts,
      ["$pull","$push","$inc","$set"]
    )
    const r = o.request;
    const t = o.type;
    const m = o.match;
    const u = o.matchUpdate;
    //filter sequence
    withType(m,t.type);
    //require userId,role
    withRequest(m,r);
    !o.force && notFull(m,t.max);
    //update sequence
    incUsers(u,-1)
    voidRequest(u,r,o.now);
    setModified(u,o.now);
    return this.matches.update(m,u,cb)
  }
}