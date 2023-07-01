export const definition = `schema {
  query: Query
  mutation: Mutation
}
type Dog {
  dogId: ID!
  breed: String!
  age: Int!
  isHousebroken: Boolean
  name: String
  description: String
}
input DogInput {
  breed: String!
  age: Int!
  isHousebroken: Boolean
  name: String
  description: String
}
type Query {
  scanDog: [Dog]
  getDogByDogId(dogId: ID!): Dog
  listDogByName(name: String): [Dog]
  listDogByAge(age: Int!): [Dog]
  listDogByBreed(breed: String!): [Dog]
  listDogByIsHousebroken(isHousebroken: Boolean): [Dog]
  scanCat: [Cat]
  getCatByCatId(catId: ID!): Cat
  listCatByName(name: String): [Cat]
  listCatByAge(age: Int!): [Cat]
  listCatByBreed(breed: String!): [Cat]
  listCatByIsHousebroken(isHousebroken: Boolean): [Cat]
  getEventByEventId(eventId: ID!): Event
  listEventByEventName(eventName: String!): [Event]
  getEventByEventNameAndStartTime(eventName: String! startTime: AWSTimestamp): Event
  scanEventSignup: [EventSignup]
  getEventSignupByEventIdAndDogId(eventId: String!): EventSignup
  listEventSignupByEventId(eventId: String!): [EventSignup]
  listEventSignupByDogId(dogId: String!): [EventSignup]
  getEventSignupByDogIdAndEventId(dogId: String! eventId: String!): EventSignup
  listEventSignupByCategory(category: String): [EventSignup]
  getEventSignupByCategoryAndDogId(category: String dogId: String!): EventSignup
  getEventSignupByEventIdAndCategory(eventId: String! category: String): EventSignup
}
type Mutation {
  createDog(input: DogInput): Dog
  putDog(dogId: ID! input: DogInput): Dog
  deleteDog(dogId: ID!): Dog
  createCat(input: CatInput): Cat
  putCat(catId: ID! input: CatInput): Cat
  deleteCat(catId: ID!): Cat
  createEvent(input: EventInput): Event
  putEvent(eventId: ID! input: EventInput): Event
  deleteEvent(eventId: ID!): Event
  putEventSignup(eventId: String! dogId: String! input: EventSignupInput): EventSignup
  deleteEventSignup(eventId: String! dogId: String!): EventSignup
}
type Cat {
  catId: ID!
  breed: String!
  age: Int!
  isHousebroken: Boolean
  name: String
  description: String
}
input CatInput {
  breed: String!
  age: Int!
  isHousebroken: Boolean
  name: String
  description: String
}
type Event {
  eventId: ID!
  eventName: String!
  startTime: AWSTimestamp
  endTime: AWSTimestamp
}
input EventInput {
  eventName: String!
  startTime: AWSTimestamp
  endTime: AWSTimestamp
}
type EventSignup {
  eventId: String!
  dogId: String!
  category: String
}
input EventSignupInput {
  category: String
}
enum Terms {
  Term1
  Term2
  Term3
}
enum Definitions {
  Def1
  Def2
  DevOps
  Mainframe
  Database
  Resiliency
  Infrastructure
  Connect
  SAP
}
enum EventTypes {
  local
  global
}
union DogAndCat = Dog | Cat
interface MyInterface {
  place: String
}
`;