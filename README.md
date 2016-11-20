# matchmaker
Server only. Arbitrarily connect users together into N-groups, with aribtrary roles.

### Details.
FIFO, atomic on a per match basis. Theoretically works out-of-the-box with N servers, 1 DB. Flexible matching rules, power of mongodb queries. **I strongly suggest using appropriate indexes, and using `explain()` prior to heavy production use.** In the future, we should separate the archive-database with the active-database, improving Meteor-oplog performance.

### Init
```
import MatchMaker from "meteor/streemo:matchmaker";
const types = [
	{type:"uber-solo", roles:{driver:1, rider:1}, max:2},
	{type:"uber-carpool", roles:{driver:1, rider:3}, max:4},
	{type:"versus", roles:{red:1, blue:1}, max:2},
	{type:"5v5", roles:{red:5, blue:5}, max:10},
	{type:"5v2", roles:{red:5, blue:2}, max:7},
	{type:"uber-for-classrooms", roles:{teacher:1, students:20}, max:21},
	{type:"uber-for-food", roles: {cook:1, customer:10}, max:11},
	...
]
const matcher = new MatchMaker({
	matchesCollection:"matches",
	archiveCollection:"archive",
	templates: types,
	playersToMatchesIsBijective:true,
	applyDefaultMatchesIndex:true,
	applyDefaultArchiveIndex:true,
	onMatch: (match) => {
		console.log("A match was made!", match);
		console.log("The type of this match is", match.type);
	}
})
```
### Example
Monkey-In-The-Middle
```
//in top-level
matcher.addType({type:"monkey-in-the-middle", roles:{monkey: 1, humans:2}})

//in method
const user = Meteor.users.findOne(this.userId);
const request = {
	role: "human",                 // required
	type:"monkey-in-the-middle",   // required
	userId: this.userId,           // required
	name: user.name,               // optional
	age: user.age,                 // optional
	...                            // optional
}
const match = {
	region: "USA",
	age: 21
}
const newOrExistingMatch = matcher.queue({request,match});
```