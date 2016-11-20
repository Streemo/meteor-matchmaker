export const withSpots = function(sel, role, roleMax){
  //avoid using bounds if only one possibility
  sel["_nRoles."+role] = roleMax > 1 ? {$lt: roleMax} : 0
}
export const withRequest = function(sel, req){
  sel.players = {$elemMatch: req};
}
export const withoutRequest = function(sel, userId){
  sel.players = {$elemMatch: {userId:{$ne:userId}}};
}
export const notFull = function(sel, typeMax){
  //avoid using bounds if only one possibility
  sel._nPlayers = typeMax > 1 ? {$lt: typeMax} : 0
}
export const withType = function(sel, type){
  sel._type = type;
}