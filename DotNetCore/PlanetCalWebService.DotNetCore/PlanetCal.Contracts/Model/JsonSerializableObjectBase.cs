using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace PlanetCal.Contracts.Model
{
    public class JsonSerializableObjectBase
    {
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
