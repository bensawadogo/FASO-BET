import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class FasoBetSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://host.docker.internal:8002")
    .acceptHeader("application/json")
    .acceptLanguageHeader("fr,en;q=0.9")

  val consultPredictions = scenario("Consulter predications")
    .exec(
      http("Stats publiques")
        .get("/api/public/stats/")
        .check(status.is(200))
    )
    .pause(1, 2)
    .exec(
      http("Predictions CdM")
        .get("/api/predictions/worldcup2026/")
        .check(status.is(200))
    )
    .pause(2, 4)
    .exec(
      http("Live status")
        .get("/api/matches/live-status/")
        .check(status.in(200, 404))
    )

  setUp(
    consultPredictions.inject(
      rampUsers(100).during(20.seconds),
      constantUsersPerSec(5).during(60.seconds),
      rampUsersPerSec(5).to(25).during(30.seconds),
      constantUsersPerSec(25).during(60.seconds)
    )
  ).protocols(httpProtocol)
  .assertions(
    global.responseTime.percentile(95).lt(5000),
    global.successfulRequests.percent.gt(90)
  )
}
