using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PlanetCal.Contracts.Model
{
    public enum AccountType
    {
        User,
        CalendarAdmin
    }
    
    [JsonObject]
    public class Account : JsonSerializableObjectBase
    {
        public Account(string name, AccountType accountType)
        {
            this.Name = name;
            this.AccountType = AccountType;
        }

        [JsonProperty(nameof(Name))]
        public string Name
        {
            get; set;
        }

        [JsonProperty(nameof(AccountType))]
        public AccountType AccountType
        {
            get;set;
        }

        [JsonProperty(nameof(Events))]
        public IEnumerable<Event> Events
        {
            get; set;
        }
    }
}
