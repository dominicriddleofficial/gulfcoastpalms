// Mock data for preview before Jobber connection
import { addHours, startOfToday, addDays, format } from "date-fns";

const today = startOfToday();

const CREWS = [
  { id: "crew-1", name: "Alpha Crew", lead: "Marcus Johnson" },
  { id: "crew-2", name: "Bravo Crew", lead: "Tyler Smith" },
];

const STATUSES = ["scheduled", "en_route", "on_site", "completed", "rescheduled"];

export const MOCK_JOBS = [
  {
    id: "j1",
    jobber_id: "mock-1",
    title: "Palm Tree Trimming",
    status: "scheduled",
    visit_status: "scheduled",
    scheduled_start: addHours(today, 8).toISOString(),
    scheduled_end: addHours(today, 10).toISOString(),
    client_name: "Sarah Mitchell",
    client_phone: "(850) 555-0101",
    property_address: "1234 Gulf Breeze Pkwy, Gulf Breeze, FL 32561",
    assigned_employee_names: ["Marcus Johnson", "Darius Lee"],
    crew_id: "crew-1",
    internal_notes: "Gate code: 4521. Dog in backyard — ring bell first.",
    job_number: "1042",
    service_items: [{ name: "Washingtonia Trim x4" }, { name: "Sabal Trim x2" }],
    total_amount: 450,
  },
  {
    id: "j2",
    jobber_id: "mock-2",
    title: "Palm Tree Installation",
    status: "scheduled",
    visit_status: "en_route",
    scheduled_start: addHours(today, 10.5).toISOString(),
    scheduled_end: addHours(today, 13).toISOString(),
    client_name: "Coastal Living HOA",
    client_phone: "(850) 555-0202",
    property_address: "5678 Navarre Beach Causeway, Navarre, FL 32566",
    assigned_employee_names: ["Marcus Johnson", "Darius Lee"],
    crew_id: "crew-1",
    internal_notes: "Install 3x Medjool Date Palms. Irrigation hookup needed. HOA contact: Jennifer.",
    job_number: "1043",
    service_items: [{ name: "Medjool Date Palm Install x3" }, { name: "Root Ball Prep" }],
    total_amount: 2800,
  },
  {
    id: "j3",
    jobber_id: "mock-3",
    title: "Diamond Cut Trimming",
    status: "scheduled",
    visit_status: "scheduled",
    scheduled_start: addHours(today, 8.5).toISOString(),
    scheduled_end: addHours(today, 11).toISOString(),
    client_name: "James & Pam Robertson",
    client_phone: "(850) 555-0303",
    property_address: "910 Pensacola Beach Blvd, Pensacola Beach, FL 32561",
    assigned_employee_names: ["Tyler Smith", "Andre Williams"],
    crew_id: "crew-2",
    internal_notes: "Premium diamond cut on 6 Canary Island palms. Customer is very particular.",
    job_number: "1044",
    service_items: [{ name: "Diamond Cut x6" }, { name: "Debris Removal" }],
    total_amount: 1200,
  },
  {
    id: "j4",
    jobber_id: "mock-4",
    title: "Palm Removal",
    status: "scheduled",
    visit_status: "on_site",
    scheduled_start: addHours(today, 13).toISOString(),
    scheduled_end: addHours(today, 16).toISOString(),
    client_name: "Destin Commons Management",
    client_phone: "(850) 555-0404",
    property_address: "4100 Legendary Dr, Destin, FL 32541",
    assigned_employee_names: ["Tyler Smith", "Andre Williams"],
    crew_id: "crew-2",
    internal_notes: "Remove 2 dead Washingtonia palms. Crane access from parking lot B.",
    job_number: "1045",
    service_items: [{ name: "Palm Removal x2" }, { name: "Stump Grinding" }],
    total_amount: 1800,
  },
  {
    id: "j5",
    jobber_id: "mock-5",
    title: "Trunk Skinning",
    status: "completed",
    visit_status: "completed",
    scheduled_start: addHours(today, 7).toISOString(),
    scheduled_end: addHours(today, 8.5).toISOString(),
    client_name: "Mike Chen",
    client_phone: "(850) 555-0505",
    property_address: "222 Quietwater Beach Rd, Pensacola Beach, FL 32561",
    assigned_employee_names: ["Marcus Johnson"],
    crew_id: "crew-1",
    internal_notes: "Quick trunk skinning. Already completed this morning.",
    job_number: "1041",
    service_items: [{ name: "Trunk Skinning x3" }],
    total_amount: 350,
  },
  // Tomorrow jobs
  {
    id: "j6",
    jobber_id: "mock-6",
    title: "Landscaping Consultation",
    status: "scheduled",
    visit_status: "scheduled",
    scheduled_start: addHours(addDays(today, 1), 9).toISOString(),
    scheduled_end: addHours(addDays(today, 1), 10).toISOString(),
    client_name: "Beach Resort Properties",
    client_phone: "(850) 555-0606",
    property_address: "7890 Scenic Hwy 98, Destin, FL 32541",
    assigned_employee_names: ["Marcus Johnson"],
    crew_id: "crew-1",
    internal_notes: "New landscaping consultation for resort entrance.",
    job_number: "1046",
    service_items: [{ name: "Consultation" }],
    total_amount: 0,
  },
  {
    id: "j7",
    jobber_id: "mock-7",
    title: "Palm Trimming - Monthly",
    status: "scheduled",
    visit_status: "scheduled",
    scheduled_start: addHours(addDays(today, 2), 8).toISOString(),
    scheduled_end: addHours(addDays(today, 2), 12).toISOString(),
    client_name: "Emerald Coast Condos",
    client_phone: "(850) 555-0707",
    property_address: "3456 Henderson Beach Dr, Destin, FL 32541",
    assigned_employee_names: ["Tyler Smith", "Andre Williams"],
    crew_id: "crew-2",
    internal_notes: "Monthly maintenance contract. 24 palms total.",
    job_number: "1047",
    service_items: [{ name: "Monthly Palm Maintenance x24" }],
    total_amount: 3600,
  },
];

export function getMockJobsForDate(date: Date) {
  const dateStr = format(date, "yyyy-MM-dd");
  return MOCK_JOBS.filter(j => j.scheduled_start && format(new Date(j.scheduled_start), "yyyy-MM-dd") === dateStr);
}

export function getMockJobsForWeek(startDate: Date) {
  const jobs = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(startDate, i);
    jobs.push(...getMockJobsForDate(d));
  }
  return jobs;
}
