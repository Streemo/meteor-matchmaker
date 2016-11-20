import { check, Match } from "meteor/check";

export const validateNew = function(opts){
  check(opts, {
    templates:[{
      type:String,
      roles:Match.Where((roles)=>{
        check(roles,Object)
        for (let r in roles)
          check(roles[r],Match.Integer)
        return true;
      }),
      max:Match.Integer
    }],
    matchesCollection:String,
    archiveCollection: String,
    onMatch: Match.Maybe(Function),
    onMatchEnd: Match.Maybe(Function),
    applyDefaultMatchesIndex: Match.Maybe(Boolean),
    applyDefaultArchiveIndex:Match.Maybe(Boolean),
    playersToMatchesIsBijective: Match.Maybe(Boolean),
  })
}
export const validateMethod = function(opts){
  check(opts, {
    type: String,
    request: Match.Maybe(
      Match.ObjectIncluding({
        role: String, 
        userId:String, 
      })
    ),
    requestUpdate: Match.Maybe(
      Match.ObjectIncluding({
        userId: Match.Maybe()
      })
    ),
    match: Match.Maybe(Object),
    matchUpdate: Match.Maybe(Object),
    fields:Match.Maybe(Object),
    /*by default, one cannot dequeue or
      requeue if a match is full. The `force`
      attribute overrides this constraint.*/
    force:Match.Maybe(Boolean)
  });
}