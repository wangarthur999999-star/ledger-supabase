import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Folder } from "../types";

const MOCK_FOLDERS: Folder[] = [
  {
    id: "1",
    name: "Choi's North",
    validity: "Geldig t/m 30 Mei",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCeFc3_OMsLZ32lWbXh4jx2OWkeYn4HLx0hEGnR3QUq1Xj7ZdcGqr2mYYXCB3ZBPwBTYR_hALgwEKhUJ51LdeMpKer8kmpa8VpW5wpLVjPdNchYV_GJsajdo3jAIrgfHnazTR0amJLJR3H3qgizgVwR6l4fq07pL1yL5EvAA4nuSgwzRentZiTCtLDLKfZyr7RgUciJB8utmi2orPHfTeSWlPZO-jDQE8BnoAyTd4ak6dXe2-CawhrjPYXBGar3PQwmsGk-E2gjkDHQ"
  },
  {
    id: "2",
    name: "Tulip Supermarkt",
    validity: "Weekend Specials",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBO-YxEEYf38pYLBFEWLTy90khmCPAOo_syMuvw4XcpsfwhaD6gwZCXyXxSM9N6ZSoDsTv6TGkC3sqKSVX6iUgLrVFbmOKaZcnfKSXdz7zO3eud2JsNTKN6KibTV9K0FIZU3ACM0_2FVtgPB4NPTkZTwjtkrThXTZOYW2c0DRzsA9WdRcczZni7XC3GAR62Z7brjbIoY2GUWaW-aekE8w3qQOMroCP2ARQSPICIW2wpBP1HCoETu2bmz6kBrU2Zz5woCkTKEFf3k5Vt"
  },
  {
    id: "3",
    name: "Combé Markt",
    validity: "Laatste Kans",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCLzeweTIujBK7yUH2D89BVVn_x4_wKYVwvkAKBex-BvqAfWV1ynZUqYqbWEhhr9hqdmydu7nylFXmofhDaM2vY1mgTRZH26--qoT_vsv9fWUCe9hJNQpouzmLf2HkjoUFJdVFgcwyrppOKiGCxsVOxVIaDpfz5msqLUMEYMNmgJ4y_hXumiAyjeftQjkp70BXf9h5qatzWdBa5JUtX4brczRUd0SKY1ehHnCx49_TevxGaRNB9YVXZn4uaoBZT4ak7GPJL9wulR9py"
  },
  {
    id: "4",
    name: "De Molen",
    validity: "Bakkerij Deals",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLgzHE1-wezmwJJ2-2cEWLQzbeEa9l1nuIfzYFGsjZb0k-B87rDGXNQ0nQVhEdPrxj8TSuq4wjNe6dgxNF0zI3GXod-lpenLCD9f7sNY1EI0NA53hj-VSLNUB6AlAGfOGI0wC59JaIiHwbFQeBemE3cSHvIRqk9R7VCPlaqso3d_LftWzOf5HWlYBj-JMwgUrGWY-e9qCw3m3iYdQzAcex4LTmh0FAAw0NJFmjTHfJ7AaxhOM9QGF1U9cSWfGATi3RWdbrolXWx0XM"
  }
];

export default function FolderCarousel() {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-headline font-bold text-2xl text-on-surface tracking-tight">Nieuwste Folders</h3>
        <button className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
          Bekijk alles <ArrowRight size={16} />
        </button>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6 snap-x group">
        {MOCK_FOLDERS.map((folder) => (
          <motion.div 
            key={folder.id}
            whileHover={{ y: -4 }}
            className="flex-shrink-0 w-48 snap-start space-y-3 cursor-pointer"
          >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-sm shadow-primary/5 bg-surface-container relative">
              <img 
                src={folder.image} 
                alt={folder.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
            <div className="px-1">
              <p className="font-bold text-sm text-on-surface truncate">{folder.name}</p>
              <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{folder.validity}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
