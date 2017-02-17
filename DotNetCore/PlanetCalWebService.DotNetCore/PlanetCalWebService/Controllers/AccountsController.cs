namespace PlanetCalWebService.Controllers
{
    using System.Collections.Generic;
    using Microsoft.AspNetCore.Mvc;
    using PlanetCal.Contracts.Model;

    [Route("[controller]")]
    public class AccountsController : Controller
    {
        // GET: /<controller>/
        public IActionResult Index()
        {
            return View();
        }

        // GET users
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "account1" };
        }

        // GET users
        [HttpGet("{id}")]
        public string Get(string id)
        {
            var account = new Account("Test" + id.ToString(), AccountType.User);

            account.Events = new List<Event>()
            {
                new Event("Event1"),
                new Event("Event2")
            };

            return account.ToString();
        }

        // POST api/values
        [HttpPost]
        public void Post([FromBody]string value)
        {
        }

        // PUT accounts/{id}
        [HttpPut("{id}")]
        public void Put(int id, [FromBody]string value)
        {
        }

        // DELETE api/values/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
