using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PlanetCal.Contracts.Model;

// For more information on enabling MVC for empty projects, visit http://go.microsoft.com/fwlink/?LinkID=397860

namespace PlanetCalWebService.Controllers
{
    [Route("[controller]")]
    public class EventsController : Controller
    {
        // GET: /<controller>/
        public IActionResult Index()
        {
            return View();
        }

        // GET users
        [HttpGet("{id}")]
        public string Get(string id)
        {
            var calEvent = new Event("Test" + id.ToString());
            return calEvent.ToString();
        }

    }
}
