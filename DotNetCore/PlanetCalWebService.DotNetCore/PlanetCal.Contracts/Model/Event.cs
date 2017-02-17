using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PlanetCal.Contracts.Model
{
    [JsonObject]
    public class Event : JsonSerializableObjectBase
    {
        public Event(string name)
        {
            this.Name = name;
        }

        [JsonProperty(nameof(Name))]
        public string Name
        {
            get; set;
        }
    }
}
