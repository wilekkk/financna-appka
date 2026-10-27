alter table public.user_data
add column if not exists custom_categories jsonb;

update public.user_data
set custom_categories = '[
  {"id": "default-income-main", "name": "Hlavný príjem", "type": "income"},
  {"id": "default-income-secondary", "name": "Vedľajší príjem", "type": "income"},
  {"id": "default-expense-food", "name": "Jedlo", "type": "expense"},
  {"id": "default-expense-housing", "name": "Bývanie", "type": "expense"},
  {"id": "default-expense-entertainment", "name": "Zábava", "type": "expense"}
]'::jsonb
where custom_categories is null;

alter table public.user_data
alter column custom_categories set default '[]'::jsonb;
