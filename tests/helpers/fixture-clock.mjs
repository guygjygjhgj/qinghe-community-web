import {mock} from 'node:test';
// These source examples take place before the October 18 activity. Pin only
// their checks; production keeps its real clock and the original dates.
mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-16T01:00:00Z')});
