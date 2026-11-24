-- Limit veľkosti dát na jeden účet (asi 10 MB textu), aby nikto nemohol zahltiť databázu.
-- Bežný účet má desiatky kB, takže limit stačí na desiatky rokov transakcií.
alter table public.user_data
add constraint user_data_max_size check (
  octet_length(coalesce(months_data::text, ''))
  + octet_length(coalesce(savings_goals::text, ''))
  + octet_length(coalesce(custom_categories::text, '')) < 10000000
);
