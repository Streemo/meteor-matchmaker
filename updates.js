import { Random } from "meteor/random";

export const setInit = function(upd, date){
  upd.$setOnInsert._id = Random.id();
  upd.$setOnInsert._createdAt = date;
  upd.$setOnInsert._nAbandoners = 0;
  upd.$setOnInsert.abandoners = [];
  upd.$setOnInsert._modifiedAt = null;
}
export const setRoles = function(upd, roles, role){
  for (let k in roles){
    if (k !== role){
      upd.$setOnInsert["_nRoles."+k] = 0
    } else {
      upd.$inc["_nRoles."+k] = 1
    }
  }
}
export const setMaxUsers = function(upd, typeMax){
  upd.$setOnInsert._nPlayersMax = typeMax
}
export const incUsers = function(upd, amount){
  upd.$inc._nPlayers = amount;
}
export const setRequest = function(upd, req, date){
  req._joinedAt = date;
  req._modifiedAt = null;
  upd.$set._filledAt = date;
  upd.$push.players = req;
}
export const voidRequest = function(upd, req, date){
  upd.$pull.players = {userId:req.userId};
  upd.$push.abandoners = {...req, _leftAt:date};
  upd.$inc._nAbandoners = 1;
  upd.$inc["_nRoles."+req.role] = -1
}
export const updRequest = function(upd, nextReq, role, date){
  upd.$set['players.$._modifiedAt'] = date;
  if (nextReq.role && nextReq.role !== role){
    upd.$inc["_nRoles."+role] = -1;
    upd.$inc["_nRoles."+nextReq.role] = 1;
  }
  for (let k in nextReq){
    upd.$set["players.$."+k] = nextReq[k];
  }
}
export const setModified = function(upd,date){
  upd.$set._modifiedAt = date;
}
export const setEnded = function(upd, date){
  upd.$set._endedAt = date;
}