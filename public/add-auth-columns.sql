ALTER TABLE public.profiles ADD COLUMN email VARCHAR(255) UNIQUE;
ALTER TABLE public.profiles ADD COLUMN encrypted_password VARCHAR(255);
UPDATE public.profiles p SET email = (SELECT email FROM auth.users u WHERE u.id = p.user_id);
