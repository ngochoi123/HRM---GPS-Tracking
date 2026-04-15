--
-- PostgreSQL database dump
--

\restrict Xz65F9r2xMNBaQ3j7PSzmKGDyZW1YLr4xwJD7TSmjc7u94cPvyu7iTlTc1i0FJi

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-10 08:51:39

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 26114)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 912 (class 1247 OID 26153)
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.attendance_status AS ENUM (
    'on_time',
    'late',
    'early_leave',
    'absent'
);


ALTER TYPE public.attendance_status OWNER TO postgres;

--
-- TOC entry 915 (class 1247 OID 26162)
-- Name: contract_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contract_type AS ENUM (
    'probation',
    'fixed_1y',
    'fixed_3y',
    'indefinite'
);


ALTER TYPE public.contract_type OWNER TO postgres;

--
-- TOC entry 918 (class 1247 OID 26172)
-- Name: decision_form; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.decision_form AS ENUM (
    'money',
    'gift',
    'warning',
    'certificate',
    'fire'
);


ALTER TYPE public.decision_form OWNER TO postgres;

--
-- TOC entry 921 (class 1247 OID 26184)
-- Name: decision_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.decision_type AS ENUM (
    'reward',
    'discipline'
);


ALTER TYPE public.decision_type OWNER TO postgres;

--
-- TOC entry 924 (class 1247 OID 26190)
-- Name: employee_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.employee_status AS ENUM (
    'active',
    'on_leave',
    'inactive'
);


ALTER TYPE public.employee_status OWNER TO postgres;

--
-- TOC entry 927 (class 1247 OID 26198)
-- Name: leave_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.leave_type AS ENUM (
    'annual',
    'sick',
    'unpaid',
    'ot',
    'maternity',
    'bereavement'
);


ALTER TYPE public.leave_type OWNER TO postgres;

--
-- TOC entry 930 (class 1247 OID 26212)
-- Name: location_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.location_type AS ENUM (
    'branch',
    'client_site',
    'wfh',
    'department_site'
);


ALTER TYPE public.location_type OWNER TO postgres;

--
-- TOC entry 933 (class 1247 OID 26222)
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'info',
    'warning',
    'system'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- TOC entry 936 (class 1247 OID 26230)
-- Name: payroll_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payroll_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'paid'
);


ALTER TYPE public.payroll_status OWNER TO postgres;

--
-- TOC entry 939 (class 1247 OID 26240)
-- Name: position_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.position_level AS ENUM (
    'intern',
    'fresher',
    'junior',
    'middle',
    'senior',
    'manager',
    'director'
);


ALTER TYPE public.position_level OWNER TO postgres;

--
-- TOC entry 942 (class 1247 OID 26256)
-- Name: request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.request_status OWNER TO postgres;

--
-- TOC entry 945 (class 1247 OID 26264)
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'locked'
);


ALTER TYPE public.user_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 26269)
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id bigint NOT NULL,
    employee_id uuid,
    work_location_id integer,
    attendance_date date NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    check_in_latitude numeric(10,6),
    check_in_longitude numeric(10,6),
    check_out_latitude numeric(10,6),
    check_out_longitude numeric(10,6),
    device_ip character varying(50),
    status public.attendance_status,
    total_work_hours numeric(5,2) DEFAULT 0,
    payroll_id uuid,
    check_out_note text
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 26275)
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 221
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- TOC entry 222 (class 1259 OID 26276)
-- Name: branch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branch (
    id integer NOT NULL,
    branch_code character varying(50) NOT NULL,
    branch_name character varying(255) NOT NULL,
    address character varying(500),
    allowed_ips text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    province character varying(100),
    hotline character varying(50),
    email character varying(255),
    description text
);


ALTER TABLE public.branch OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 26286)
-- Name: branch_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branch_id_seq OWNER TO postgres;

--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 223
-- Name: branch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branch_id_seq OWNED BY public.branch.id;


--
-- TOC entry 224 (class 1259 OID 26287)
-- Name: contract; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number character varying(100) NOT NULL,
    employee_id uuid,
    contract_type public.contract_type NOT NULL,
    start_date date NOT NULL,
    end_date date,
    base_salary numeric(15,2) NOT NULL,
    allowances jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contract OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 26300)
-- Name: department; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department (
    id integer NOT NULL,
    department_code character varying(50) NOT NULL,
    department_name character varying(255) NOT NULL,
    branch_id integer,
    manager_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description character varying(100)
);


ALTER TABLE public.department OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 26308)
-- Name: department_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_id_seq OWNER TO postgres;

--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 226
-- Name: department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.department_id_seq OWNED BY public.department.id;


--
-- TOC entry 227 (class 1259 OID 26309)
-- Name: employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_code character varying(50) NOT NULL,
    full_name character varying(255) NOT NULL,
    personal_email character varying(255),
    work_email character varying(255),
    phone_number character varying(20),
    date_of_birth date,
    identity_card_number character varying(20),
    gender boolean,
    bank_account_number character varying(50),
    avatar_url character varying(500),
    position_id integer,
    direct_manager_id uuid,
    join_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.employee_status DEFAULT 'active'::public.employee_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    address text,
    bank_name character varying(100)
);


ALTER TABLE public.employee OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 26323)
-- Name: hr_decision; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hr_decision (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_number character varying(100) NOT NULL,
    employee_id uuid,
    decision_type public.decision_type NOT NULL,
    form public.decision_form NOT NULL,
    amount numeric(15,2) DEFAULT 0,
    reason text NOT NULL,
    issue_date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    issuer_id uuid,
    payroll_id uuid,
    attachment_url character varying(255)
);


ALTER TABLE public.hr_decision OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 26337)
-- Name: leave_request; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    leave_type public.leave_type NOT NULL,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    reason text,
    approver_id uuid,
    status public.request_status DEFAULT 'pending'::public.request_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    attachment text
);


ALTER TABLE public.leave_request OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 26349)
-- Name: location_assignment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_assignment (
    id bigint NOT NULL,
    employee_id uuid,
    work_location_id integer NOT NULL,
    assigned_date date,
    is_temporary boolean DEFAULT false,
    status public.request_status DEFAULT 'approved'::public.request_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    branch_id integer,
    department_id integer,
    CONSTRAINT check_single_target CHECK ((((((branch_id IS NOT NULL))::integer + ((department_id IS NOT NULL))::integer) + ((employee_id IS NOT NULL))::integer) = 1))
);


ALTER TABLE public.location_assignment OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 26358)
-- Name: location_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_assignment_id_seq OWNER TO postgres;

--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 231
-- Name: location_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_assignment_id_seq OWNED BY public.location_assignment.id;


--
-- TOC entry 232 (class 1259 OID 26359)
-- Name: notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    notification_type public.notification_type DEFAULT 'info'::public.notification_type,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    target character varying(255) DEFAULT 'Tất cả nhân viên'::character varying,
    "desc" character varying(255),
    status character varying(50) DEFAULT 'Đã gửi'::character varying,
    target_department_id integer,
    target_employee_id uuid
);


ALTER TABLE public.notification OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 26372)
-- Name: notification_recipient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_recipient (
    id bigint NOT NULL,
    notification_id uuid,
    employee_id uuid,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone
);


ALTER TABLE public.notification_recipient OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 26377)
-- Name: notification_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_recipient_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_recipient_id_seq OWNER TO postgres;

--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 234
-- Name: notification_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_recipient_id_seq OWNED BY public.notification_recipient.id;


--
-- TOC entry 235 (class 1259 OID 26378)
-- Name: overtime_request; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.overtime_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    payroll_id uuid,
    ot_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    reason text NOT NULL,
    approver_id uuid,
    status public.request_status DEFAULT 'pending'::public.request_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.overtime_request OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 26391)
-- Name: payroll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    month_year character varying(10) NOT NULL,
    base_salary_snapshot numeric(15,2) NOT NULL,
    total_work_days numeric(5,2) DEFAULT 0,
    total_allowance numeric(15,2) DEFAULT 0,
    total_deduction numeric(15,2) DEFAULT 0,
    net_salary numeric(15,2) NOT NULL,
    status public.payroll_status DEFAULT 'draft'::public.payroll_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payroll OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 26404)
-- Name: position; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."position" (
    id integer NOT NULL,
    position_code character varying(50) NOT NULL,
    position_name character varying(255) NOT NULL,
    department_id integer,
    level public.position_level NOT NULL,
    base_salary_min numeric(15,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."position" OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 26413)
-- Name: position_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.position_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.position_id_seq OWNER TO postgres;

--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 238
-- Name: position_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.position_id_seq OWNED BY public."position".id;


--
-- TOC entry 239 (class 1259 OID 26414)
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    config_key character varying(50) NOT NULL,
    config_value character varying(255) NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 26422)
-- Name: user_account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_code character varying(50) NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    require_pass_change boolean DEFAULT false
);


ALTER TABLE public.user_account OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 26433)
-- Name: work_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_location (
    id integer NOT NULL,
    location_name character varying(255) NOT NULL,
    location_type public.location_type NOT NULL,
    latitude numeric(10,6) NOT NULL,
    longitude numeric(10,6) NOT NULL,
    radius_meters integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    branch_id integer,
    CONSTRAINT work_location_latitude_check CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))),
    CONSTRAINT work_location_longitude_check CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))),
    CONSTRAINT work_location_radius_meters_check CHECK ((radius_meters > 0))
);


ALTER TABLE public.work_location OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 26447)
-- Name: work_location_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_location_id_seq OWNER TO postgres;

--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 242
-- Name: work_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_location_id_seq OWNED BY public.work_location.id;


--
-- TOC entry 4996 (class 2604 OID 26448)
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 26449)
-- Name: branch id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch ALTER COLUMN id SET DEFAULT nextval('public.branch_id_seq'::regclass);


--
-- TOC entry 5004 (class 2604 OID 26450)
-- Name: department id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department ALTER COLUMN id SET DEFAULT nextval('public.department_id_seq'::regclass);


--
-- TOC entry 5018 (class 2604 OID 26451)
-- Name: location_assignment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_assignment ALTER COLUMN id SET DEFAULT nextval('public.location_assignment_id_seq'::regclass);


--
-- TOC entry 5027 (class 2604 OID 26452)
-- Name: notification_recipient id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipient ALTER COLUMN id SET DEFAULT nextval('public.notification_recipient_id_seq'::regclass);


--
-- TOC entry 5038 (class 2604 OID 26453)
-- Name: position id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."position" ALTER COLUMN id SET DEFAULT nextval('public.position_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 26454)
-- Name: work_location id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_location ALTER COLUMN id SET DEFAULT nextval('public.work_location_id_seq'::regclass);


--
-- TOC entry 5295 (class 0 OID 26269)
-- Dependencies: 220
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, employee_id, work_location_id, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, device_ip, status, total_work_hours, payroll_id, check_out_note) FROM stdin;
1	cccccccc-cccc-cccc-cccc-cccccccccccc	2	2026-03-19	2026-03-19 08:00:00+07	2026-03-19 17:00:00+07	16.067780	108.220830	\N	\N	\N	on_time	8.00	\N	\N
5	cccccccc-cccc-cccc-cccc-cccccccccccc	\N	2026-03-31	2026-03-31 08:00:00+07	\N	\N	\N	\N	\N	\N	on_time	0.00	\N	\N
6	80966e2b-89e4-49b1-9948-57d226a9f363	\N	2026-03-31	2026-03-31 08:30:00+07	\N	\N	\N	\N	\N	\N	late	0.00	\N	\N
7	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	\N	2026-03-31	2026-03-31 07:50:00+07	\N	\N	\N	\N	\N	\N	on_time	0.00	\N	\N
13	11111111-1111-1111-1111-111111111111	4	2026-04-02	2026-04-02 15:10:40.927378+07	2026-04-02 15:29:30.714365+07	16.059225	108.173997	16.059159	108.174080	192.168.2.155	early_leave	0.31	\N	\N
14	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	4	2026-04-02	2026-04-02 16:25:17.335422+07	2026-04-02 16:25:36.534258+07	16.059252	108.173951	16.059252	108.173951	192.168.2.155	early_leave	0.01	\N	\N
17	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	4	2026-04-04	2026-04-04 08:19:32.287327+07	\N	16.058923	108.174207	\N	\N	127.0.0.1	late	0.00	\N	\N
18	11111111-1111-1111-1111-111111111111	4	2026-04-04	2026-04-04 08:19:45.048434+07	2026-04-04 08:20:13.011861+07	16.059286	108.173988	16.059286	108.173988	192.168.2.155	early_leave	0.01	\N	\N
20	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	4	2026-04-06	2026-04-06 14:05:22.825122+07	2026-04-06 14:11:16.579761+07	16.059089	108.174146	16.059118	108.174155	127.0.0.1	early_leave	0.10	\N	\N
21	e74753ac-9c92-46db-b218-c2aae266f01d	4	2026-04-06	2026-04-06 14:25:14.487893+07	2026-04-06 14:48:40.355384+07	16.059092	108.174147	16.059101	108.174297	127.0.0.1	early_leave	0.38	\N	\N
\.


--
-- TOC entry 5297 (class 0 OID 26276)
-- Dependencies: 222
-- Data for Name: branch; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branch (id, branch_code, branch_name, address, allowed_ips, is_active, created_at, province, hotline, email, description) FROM stdin;
4	CN_3084	Oye	Chưa cập nhật địa chỉ	{}	t	2026-03-25 11:10:58.436035+07	\N	\N	\N	\N
6	HN02	Chi nhánh Hà Nội	Tòa nhà Lotte, Liễu Giai, Ba Đình	\N	t	2026-03-26 14:44:48.012089+07	\N	\N	\N	\N
7	HCM02	Chi nhánh Hồ Chí Minh	Landmark 81, Vinhomes Central Park, Bình Thạnh	\N	t	2026-03-26 14:44:48.012089+07	\N	\N	\N	\N
3	CN_3864	Đá Và Ong	Chưa cập nhật địa chỉ	{}	t	2026-03-21 14:00:05.585715+07	\N	\N	\N	\N
1	HN01	Trụ sở chính Hà Nội	123 Cầu Giấy, Hà Nội	{192.168.1.1,113.190.233.1}	t	2026-03-19 08:39:12.006185+07	\N	\N	\N	\N
8	CN_7736	Nhà Khang	Chưa cập nhật	{}	f	2026-04-05 16:32:23.87592+07	\N	\N	\N	\N
9	CN_3475	Khu vực mới	Chưa cập nhật	{}	f	2026-04-05 16:39:23.342313+07	\N	\N	\N	\N
10	CN_579	Khu vực mới	Chưa cập nhật	{}	f	2026-04-05 16:39:44.644356+07	\N	\N	\N	\N
11	BR-1775445768972	Chưa gắn chi nhánh	\N	{}	t	2026-04-06 10:22:48.971565+07	\N	\N	\N	\N
2	DN01	Chưa gắn chi nhánh	456 Lê Duẩn, Đà Nẵng	{}	t	2026-03-19 08:39:12.006185+07	\N	\N	\N	\N
12	HT-35	Học Tập	120 Hoàng Minh Thảo	\N	t	2026-04-08 18:14:21.506016+07	Đà Nẵng	0946516724	khangtrong2k4@gmail.com	Hihi
\.


--
-- TOC entry 5299 (class 0 OID 26287)
-- Dependencies: 224
-- Data for Name: contract; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract (id, contract_number, employee_id, contract_type, start_date, end_date, base_salary, allowances, is_active, created_at) FROM stdin;
cf44639f-e958-4a39-b901-8c379b975839	HD-2024-04	dddddddd-dddd-dddd-dddd-dddddddddddd	indefinite	2024-03-01	\N	25000000.00	\N	t	2026-03-19 08:39:12.006185+07
6ad9b1dc-0f96-4826-a217-b10a2183819e	HD-2024-01	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	fixed_1y	2024-01-01	2026-03-29	50000000.00	[]	t	2026-03-19 08:39:12.006185+07
704204bb-15ac-4b65-89aa-4491280a8575	HD-2024-03	cccccccc-cccc-cccc-cccc-cccccccccccc	fixed_1y	2024-06-15	\N	0.00	[]	t	2026-03-19 08:39:12.006185+07
156c3b9a-51d2-4e18-a47c-9d6bf68d1c21	HD-2026-3587	22222222-2222-2222-2222-222222222222	indefinite	2026-03-28	\N	0.00	[]	t	2026-03-28 13:51:42.228833+07
3c21611a-a584-4025-97b9-f1a50082d861	HD-2026-6938	22222222-2222-2222-2222-222222222222	probation	2026-03-28	\N	0.00	[]	t	2026-03-28 13:52:12.250222+07
2be6ca4e-c73b-47f2-a60d-03be0aa963fe	HD-2026-1963	9c80270b-9f4b-4878-85d2-37bc36ae4ceb	fixed_3y	2026-03-30	2029-03-29	20000000.00	[]	t	2026-03-30 15:28:08.149232+07
78cfcf3d-fe36-4be8-8fc7-41b047a09de4	HD-2026-D02	33333333-3333-3333-3333-333333333333	indefinite	2026-04-05	\N	60000000.00	[]	t	2026-04-05 16:10:23.528734+07
97c699d3-1a5b-48ac-8dc4-77079e16ee20	HD-2026-M02	44444444-4444-4444-4444-444444444444	fixed_3y	2026-04-05	2029-04-05	35000000.00	[]	t	2026-04-05 16:10:23.528734+07
966c34d4-fdb7-40c3-84da-83351e680f6a	HD-2026-A02	55555555-5555-5555-5555-555555555555	fixed_1y	2026-04-05	2027-04-05	20000000.00	[]	t	2026-04-05 16:10:23.528734+07
ea3233d8-fe95-470e-b84f-d7b9c2781a4f	HD-2026-E02	66666666-6666-6666-6666-666666666666	probation	2026-04-05	2026-06-05	10000000.00	[]	t	2026-04-05 16:10:23.528734+07
c36b5a7a-8ef3-4a1d-8ed3-1ac39dbc3feb	HD-2024-02	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	fixed_3y	2024-02-01	\N	30000000.00	[{"name": "hhhhh", "amount": 1213}, {"name": "jj", "amount": 0}]	t	2026-03-19 08:39:12.006185+07
64f3296f-b579-413c-b17d-77933ebbc10a	HD-2026-8556	e74753ac-9c92-46db-b218-c2aae266f01d	fixed_1y	2026-04-09	2027-04-08	12000000.00	[]	t	2026-04-09 15:48:09.836051+07
\.


--
-- TOC entry 5300 (class 0 OID 26300)
-- Dependencies: 225
-- Data for Name: department; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.department (id, department_code, department_name, branch_id, manager_id, is_active, created_at, description) FROM stdin;
5	PB_1774845033808	Phòng Chứng Khoán	2	\N	t	2026-03-30 11:30:33.842298+07	Phòng này để thổi nến
2	HR	Phòng Nhân sự	3	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	t	2026-03-19 08:39:12.006185+07	
1	BOD	Ban Giám Đốc	3	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	t	2026-03-19 08:39:12.006185+07	
4	SYS	Phòng Quản trị Hệ thống	12	55555555-5555-5555-5555-555555555555	t	2026-03-19 08:39:12.006185+07	
3	IT	Phòng Công nghệ Thông tin	12	e74753ac-9c92-46db-b218-c2aae266f01d	t	2026-03-19 08:39:12.006185+07	
\.


--
-- TOC entry 5302 (class 0 OID 26309)
-- Dependencies: 227
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee (id, employee_code, full_name, personal_email, work_email, phone_number, date_of_birth, identity_card_number, gender, bank_account_number, avatar_url, position_id, direct_manager_id, join_date, status, created_at, updated_at, address, bank_name) FROM stdin;
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	EMP-001	Nguyễn Văn Giám Đốc	bod@gmail.com	ceo@congty.com	0901000001	\N	\N	t	\N	\N	1	\N	2026-03-19	active	2026-03-19 08:39:12.006185+07	2026-03-19 08:39:12.006185+07	\N	\N
dddddddd-dddd-dddd-dddd-dddddddddddd	EMP-004	Phạm Quản Trị Hệ Thống	sys@gmail.com	admin@congty.com	0901000004	\N	\N	t	\N	\N	4	\N	2026-03-19	active	2026-03-19 08:39:12.006185+07	2026-03-19 08:39:12.006185+07	\N	\N
cccccccc-cccc-cccc-cccc-cccccccccccc	EMP-003	Lê Lập Trình Viên	dev@gmail.com	employee@congty.com	0901000003	\N	\N	t	\N	\N	3	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	2026-03-19	active	2026-03-19 08:39:12.006185+07	2026-03-19 08:39:12.006185+07	\N	\N
bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	EMP-002	Trần Thị Quản Lý	hr@gmail.com	manager@congty.com	0901000002	\N	\N	f	\N	\N	2	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	2026-03-19	active	2026-03-19 08:39:12.006185+07	2026-03-19 08:39:12.006185+07	\N	\N
5c24176c-94be-4995-85d2-d8e268881f1d	EMP-999888	Nguyễn Văn Test	canhan.test@gmail.com	nvtest.gps@gmail.com	\N	\N	\N	\N	\N	\N	1	\N	2026-03-21	active	2026-03-21 08:35:21.947429+07	2026-03-21 08:35:21.947429+07	\N	\N
11111111-1111-1111-1111-111111111111	EMP-005	Ngô Ngọc Hội	ngochoinct@gmail.com	ngochoinct@congty.com	0909999888	2004-12-14	066204008905	t	63210000824482	\N	3	cccccccc-cccc-cccc-cccc-cccccccccccc	2026-03-19	active	2026-03-19 13:17:41.860411+07	2026-03-27 14:26:09.385492+07	15 Trần Đình Nam	BIDV
22222222-2222-2222-2222-222222222222	ADM-001	Administrator - Ngô Ngọc Hội	ngochoivts6a@gmail.com	admin.hoi@congty.com	0909123456	\N	\N	t	\N	\N	1	\N	2026-03-19	active	2026-03-19 15:51:26.380878+07	2026-03-19 15:51:26.380878+07	\N	\N
80966e2b-89e4-49b1-9948-57d226a9f363	NV-2026-5938	Châu Ngọc Hội	chaungochoi@dtu.edu.vn	chaungochoi@dtu.edu.vn	0866478997	2026-03-18	066204008905	t	63210000824482	\N	3	11111111-1111-1111-1111-111111111111	2026-03-30	active	2026-03-30 12:43:56.990304+07	2026-03-30 12:43:56.990304+07	Krông Pak	BIDV
d582164b-8e56-478f-b485-6678ca75b43b	NV-2026-6753	Lê Trường Giang	zenblack991@gmail.com	zenwhite991@gmail.com	0866478997	2026-03-12	0451245944	t	63210000824482	\N	3	80966e2b-89e4-49b1-9948-57d226a9f363	2026-03-30	active	2026-03-30 15:20:37.396729+07	2026-03-30 15:20:37.396729+07	Krông Pak	ABC
9c80270b-9f4b-4878-85d2-37bc36ae4ceb	EMP-953560	Ngô Đăng Khoa	ndkkhoa10c10@gmail.com	ndkkhoa10c10@gmail.com	\N	\N	\N	\N	\N	\N	3	\N	2026-03-20	active	2026-03-20 16:50:01.464245+07	2026-03-20 16:50:01.464245+07	\N	\N
33333333-3333-3333-3333-333333333333	EMP-D02	Trần Tổng Giám Đốc	director2.personal@gmail.com	director2@congty.com	0902000001	\N	\N	t	\N	\N	1	\N	2026-04-05	active	2026-04-05 16:10:23.528734+07	2026-04-05 16:10:23.528734+07	\N	\N
44444444-4444-4444-4444-444444444444	EMP-M02	Lê Trưởng Phòng	manager2.personal@gmail.com	manager2@congty.com	0902000002	\N	\N	f	\N	\N	2	\N	2026-04-05	active	2026-04-05 16:10:23.528734+07	2026-04-05 16:10:23.528734+07	\N	\N
55555555-5555-5555-5555-555555555555	EMP-A02	Nguyễn Quản Trị	admin2.personal@gmail.com	admin2@congty.com	0902000003	\N	\N	t	\N	\N	4	\N	2026-04-05	active	2026-04-05 16:10:23.528734+07	2026-04-05 16:10:23.528734+07	\N	\N
66666666-6666-6666-6666-666666666666	EMP-E02	Phạm Nhân Viên	employee2.personal@gmail.com	employee2@congty.com	0902000004	\N	\N	t	\N	\N	3	\N	2026-04-05	active	2026-04-05 16:10:23.528734+07	2026-04-05 16:10:23.528734+07	\N	\N
e74753ac-9c92-46db-b218-c2aae266f01d	EMP-554954	Trần Chọng Kheng	\N	khangtrong2k5@gmail.com	\N	\N	\N	\N	\N	\N	3	\N	2026-04-06	active	2026-04-06 14:23:11.459584+07	2026-04-09 14:26:37.896705+07	\N	\N
\.


--
-- TOC entry 5303 (class 0 OID 26323)
-- Dependencies: 228
-- Data for Name: hr_decision; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hr_decision (id, decision_number, employee_id, decision_type, form, amount, reason, issue_date, created_at, issuer_id, payroll_id, attachment_url) FROM stdin;
cd71c638-b5bb-40bf-bc40-cdb90fd866a1	QĐ-2026-001	11111111-1111-1111-1111-111111111111	reward	money	2000000.00	Thưởng nhân viên xuất sắc tháng 2/2026	2026-03-05	2026-04-04 08:48:49.683876+07	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	\N	\N
5f9a997c-cde9-4640-85c1-bb48e645458a	QĐ-2026-002	5c24176c-94be-4995-85d2-d8e268881f1d	discipline	money	500000.00	Phạt đi muộn 3 lần liên tiếp trong tuần	2026-03-10	2026-04-04 08:48:49.683876+07	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	\N	\N
88dc631a-1e58-4173-9841-6d1f2c532b78	QĐ-2026-003	cccccccc-cccc-cccc-cccc-cccccccccccc	discipline	warning	0.00	Cảnh cáo vi phạm quy định bảo mật hệ thống máy chủ	2026-03-15	2026-04-04 08:48:49.683876+07	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	\N	\N
87472e97-7e3d-4bb5-a5d9-2f057f5f4a06	QĐ-2026-004	80966e2b-89e4-49b1-9948-57d226a9f363	reward	money	5000000.00	Thưởng vượt tiến độ dự án Đồ án Tốt nghiệp xuất sắc	2026-03-20	2026-04-04 08:48:49.683876+07	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	\N	\N
60f011c3-3ab2-48a6-907b-bf1e49a5f6ba	QĐ-2026-005	d582164b-8e56-478f-b485-6678ca75b43b	discipline	money	200000.00	Không nộp báo cáo công việc cuối tuần	2026-03-25	2026-04-04 08:48:49.683876+07	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	\N	\N
e5754bfa-9e27-489e-b5c2-4ee8a4832671	QĐ-26-006	e74753ac-9c92-46db-b218-c2aae266f01d	reward	money	500000.00	ỨNG LƯƠNG	2026-04-09	2026-04-09 14:24:08.796568+07	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	\N	/uploads/QD-1775719448625-635805893.png
\.


--
-- TOC entry 5304 (class 0 OID 26337)
-- Dependencies: 229
-- Data for Name: leave_request; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_request (id, employee_id, leave_type, start_datetime, end_datetime, reason, approver_id, status, created_at, attachment) FROM stdin;
a61243b2-f724-4f12-8c0a-299b716e1b17	cccccccc-cccc-cccc-cccc-cccccccccccc	annual	2026-03-20 00:00:00+07	2026-03-21 00:00:00+07	Xin nghỉ về quê	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	approved	2026-03-19 08:39:12.006185+07	\N
\.


--
-- TOC entry 5305 (class 0 OID 26349)
-- Dependencies: 230
-- Data for Name: location_assignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_assignment (id, employee_id, work_location_id, assigned_date, is_temporary, status, created_at, branch_id, department_id) FROM stdin;
\.


--
-- TOC entry 5307 (class 0 OID 26359)
-- Dependencies: 232
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification (id, sender_id, title, content, notification_type, created_at, target, "desc", status, target_department_id, target_employee_id) FROM stdin;
eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee	dddddddd-dddd-dddd-dddd-dddddddddddd	Chào mừng hệ thống GPS mới	Hệ thống chấm công GPS đã chính thức đi vào hoạt động.	system	2026-03-19 08:39:12.006185+07	Tất cả nhân viên	\N	Đã gửi	\N	\N
5de62bc2-e6a3-482c-8849-aa67f7f4ecaf	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	Heloo	Test	info	2026-03-30 11:29:02.962515+07	Cá nhân	Test...	Đã gửi	1	22222222-2222-2222-2222-222222222222
baaf0654-5f4b-4749-9150-40c98103ab9c	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	test phong ban	Tết rồi anh em ơi	warning	2026-03-30 11:31:19.441756+07	Phòng ban	Tết rồi anh em ơi...	Đã gửi	2	\N
96e08a80-b7cf-4a92-b668-74389d8bb595	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	Hôm Nay	Tôi Xong sprint1	info	2026-03-30 15:29:52.764956+07	Phòng ban	Tôi Xong sprint1...	Đã gửi	1	\N
5ca62fff-31ce-48f6-8755-63eca0640992	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	Hôm nay	Xong sprint 1	info	2026-03-30 15:30:55.792264+07	Phòng ban	Xong sprint 1...	Đã gửi	3	\N
7f85d0f5-0f4a-41c3-88e2-112be65a3d5d	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	Hôm nay	Cảnh báo	warning	2026-03-30 15:31:12.622513+07	Phòng ban	Cảnh báo...	Đã gửi	3	\N
843f173f-e3a5-49cc-b935-a6c833884966	\N	🎉 Quyết định Khen thưởng: QĐ-26-006	<p>Phòng Nhân sự vừa ban hành Quyết định đối với bạn.</p><ul><li>Hình thức: money</li><li>Lý do: ỨNG LƯƠNG</li></ul>	info	2026-04-09 14:24:08.796568+07	Cá nhân	Quyết định số QĐ-26-006	Đã gửi	\N	e74753ac-9c92-46db-b218-c2aae266f01d
\.


--
-- TOC entry 5308 (class 0 OID 26372)
-- Dependencies: 233
-- Data for Name: notification_recipient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_recipient (id, notification_id, employee_id, is_read, read_at) FROM stdin;
1	eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee	cccccccc-cccc-cccc-cccc-cccccccccccc	f	\N
2	5de62bc2-e6a3-482c-8849-aa67f7f4ecaf	22222222-2222-2222-2222-222222222222	t	2026-03-30 11:29:13.794426+07
5	96e08a80-b7cf-4a92-b668-74389d8bb595	5c24176c-94be-4995-85d2-d8e268881f1d	f	\N
6	96e08a80-b7cf-4a92-b668-74389d8bb595	22222222-2222-2222-2222-222222222222	f	\N
7	5ca62fff-31ce-48f6-8755-63eca0640992	cccccccc-cccc-cccc-cccc-cccccccccccc	f	\N
8	5ca62fff-31ce-48f6-8755-63eca0640992	11111111-1111-1111-1111-111111111111	f	\N
9	5ca62fff-31ce-48f6-8755-63eca0640992	80966e2b-89e4-49b1-9948-57d226a9f363	f	\N
11	5ca62fff-31ce-48f6-8755-63eca0640992	9c80270b-9f4b-4878-85d2-37bc36ae4ceb	f	\N
12	7f85d0f5-0f4a-41c3-88e2-112be65a3d5d	cccccccc-cccc-cccc-cccc-cccccccccccc	f	\N
13	7f85d0f5-0f4a-41c3-88e2-112be65a3d5d	11111111-1111-1111-1111-111111111111	f	\N
14	7f85d0f5-0f4a-41c3-88e2-112be65a3d5d	80966e2b-89e4-49b1-9948-57d226a9f363	f	\N
10	5ca62fff-31ce-48f6-8755-63eca0640992	d582164b-8e56-478f-b485-6678ca75b43b	t	2026-03-30 15:31:44.117989+07
15	7f85d0f5-0f4a-41c3-88e2-112be65a3d5d	d582164b-8e56-478f-b485-6678ca75b43b	t	2026-03-30 15:32:15.763466+07
4	96e08a80-b7cf-4a92-b668-74389d8bb595	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	t	2026-04-02 08:08:58.909799+07
16	7f85d0f5-0f4a-41c3-88e2-112be65a3d5d	9c80270b-9f4b-4878-85d2-37bc36ae4ceb	t	2026-04-02 08:32:29.157461+07
3	baaf0654-5f4b-4749-9150-40c98103ab9c	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	t	2026-04-02 16:22:49.038027+07
17	843f173f-e3a5-49cc-b935-a6c833884966	e74753ac-9c92-46db-b218-c2aae266f01d	f	\N
\.


--
-- TOC entry 5310 (class 0 OID 26378)
-- Dependencies: 235
-- Data for Name: overtime_request; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.overtime_request (id, employee_id, payroll_id, ot_date, start_time, end_time, reason, approver_id, status, created_at) FROM stdin;
\.


--
-- TOC entry 5311 (class 0 OID 26391)
-- Dependencies: 236
-- Data for Name: payroll; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll (id, employee_id, month_year, base_salary_snapshot, total_work_days, total_allowance, total_deduction, net_salary, status, created_at) FROM stdin;
6b2ee5f6-ba8c-4ecf-bf50-37c71d01c9f2	cccccccc-cccc-cccc-cccc-cccccccccccc	03-2026	15000000.00	22.00	500000.00	0.00	15500000.00	approved	2026-03-19 08:39:12.006185+07
\.


--
-- TOC entry 5312 (class 0 OID 26404)
-- Dependencies: 237
-- Data for Name: position; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."position" (id, position_code, position_name, department_id, level, base_salary_min, created_at) FROM stdin;
1	CEO	Giám đốc Điều hành	1	director	50000000.00	2026-03-19 08:39:12.006185+07
2	HR_MGR	Trưởng phòng Nhân sự	2	manager	25000000.00	2026-03-19 08:39:12.006185+07
3	IT_DEV	Lập trình viên Backend	3	junior	12000000.00	2026-03-19 08:39:12.006185+07
4	ADMIN	Quản trị viên Hệ thống	4	senior	20000000.00	2026-03-19 08:39:12.006185+07
\.


--
-- TOC entry 5314 (class 0 OID 26414)
-- Dependencies: 239
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_config (config_key, config_value, description, updated_at) FROM stdin;
DEFAULT_WORK_HOURS	8	Số giờ làm việc tiêu chuẩn trong ngày (tiếng)	2026-03-19 08:39:12.006185+07
DEFAULT_LATE_TOLERANCE	15	Số phút đi muộn tối đa cho phép	2026-03-19 08:39:12.006185+07
WIFI_CHECK_ENABLED	true	Bật/Tắt tính năng check IP Wifi khi chấm công	2026-03-19 08:39:12.006185+07
\.


--
-- TOC entry 5315 (class 0 OID 26422)
-- Dependencies: 240
-- Data for Name: user_account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_account (id, employee_id, username, password_hash, role_code, status, last_login, created_at, require_pass_change) FROM stdin;
83b0986f-7d8a-4bc5-98e5-d9bf1d1e84a5	cccccccc-cccc-cccc-cccc-cccccccccccc	employee	$2a$06$l0UWNr9Jv/cW/lLp4O9/a.qI/K7aRNbycsU0dJzuMdzjKpiYTulry	USER	active	\N	2026-03-19 08:39:12.006185+07	f
a4dada9a-d1d6-466a-b1e2-842d5a210cb4	bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	manager@gmail.com	$2a$06$k1YDUZUC5UQEhIEYswWNTOLF3kDt/c9a4TnSfD/aFNr3ONdtO0iG2	MANAGER	active	\N	2026-03-19 08:39:12.006185+07	f
b6b614e5-ac64-45af-b3c3-9f9dd1c1de56	aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	director@gmail.com	$2a$06$dS1yCOxXwi.ILBDRCDucOeixjDWc1QoaRNo9UmUDjhmBAcDWjB9b2	DIRECTOR	active	\N	2026-03-19 08:39:12.006185+07	f
853c0252-050a-44d3-b2e1-0250f3a546ae	22222222-2222-2222-2222-222222222222	ngochoivts6a@gmail.com	$2a$06$9COdOvB2h32fwaiLrR.OBO.xtEtRlqko1jGmP95k9WkDseOL7uKbi	ADMIN	active	\N	2026-03-19 15:51:26.380878+07	f
e5ccb6ac-6a61-40ba-9203-e015c9911a1b	80966e2b-89e4-49b1-9948-57d226a9f363	chaungochoi@dtu.edu.vn	$2b$10$d6wwS6730p3bTkMiIs9qweyKbzHxJILmeEm/vOSlpAvZ.RSEmDoO6	employee	active	\N	2026-03-30 12:43:56.990304+07	t
132b1962-9108-4ae6-910a-3ab6d951c14f	11111111-1111-1111-1111-111111111111	ngochoinct@gmail.com	$2a$06$W47cLHufIeF4UbHKwbVOgeW3KDNDeN6yc7mibjbylEroil9bbf2RK	USER	active	\N	2026-03-19 13:17:41.860411+07	f
826390f2-9eb6-4160-bea3-f68cd8dda120	9c80270b-9f4b-4878-85d2-37bc36ae4ceb	ndkkhoa10c10@gmail.com	$2a$06$sFROTFTyh6mlFwlbMMwVGuhWzpqxoAuiGspN.WDGWIeA75sbpRBoO	USER	active	\N	2026-03-20 16:50:01.464245+07	f
e6579cc2-b821-42bc-818c-f6b80663eecb	d582164b-8e56-478f-b485-6678ca75b43b	zenblack991@gmail.com	$2a$06$b.mxo/s1GVJWTlXD12UliuBoZv.DC33YS4xGW8cT9G1O.WZuVC7K.	employee	active	\N	2026-03-30 15:20:37.396729+07	f
4a9fe0b1-3c9b-4d11-ac4f-31899d20e21a	33333333-3333-3333-3333-333333333333	director2@gmail.com	$2a$06$l0UWNr9Jv/cW/lLp4O9/a.qI/K7aRNbycsU0dJzuMdzjKpiYTulry	DIRECTOR	active	\N	2026-04-05 16:10:23.528734+07	f
36a13d4f-b63c-466d-894e-a92842309fc0	44444444-4444-4444-4444-444444444444	manager2@gmail.com	$2a$06$l0UWNr9Jv/cW/lLp4O9/a.qI/K7aRNbycsU0dJzuMdzjKpiYTulry	MANAGER	active	\N	2026-04-05 16:10:23.528734+07	f
4efc3878-8f11-4d5b-84fe-951ecfa2cd3d	55555555-5555-5555-5555-555555555555	admin2@gmail.com	$2a$06$l0UWNr9Jv/cW/lLp4O9/a.qI/K7aRNbycsU0dJzuMdzjKpiYTulry	ADMIN	active	\N	2026-04-05 16:10:23.528734+07	f
c99c53da-0687-45a8-9da5-05ca202ca721	66666666-6666-6666-6666-666666666666	employee2@gmail.com	$2a$06$l0UWNr9Jv/cW/lLp4O9/a.qI/K7aRNbycsU0dJzuMdzjKpiYTulry	employee	active	\N	2026-04-05 16:10:23.528734+07	f
e9fb1aed-48a1-446b-b856-8956043e15eb	e74753ac-9c92-46db-b218-c2aae266f01d	khangtrong2k5	$2a$06$Qjdy3L8vbHVQrTtFqZgeNewGCO9Try881dNRgztBER8mUjSKw5G/y	USER	active	\N	2026-04-06 14:23:11.459584+07	f
\.


--
-- TOC entry 5316 (class 0 OID 26433)
-- Dependencies: 241
-- Data for Name: work_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_location (id, location_name, location_type, latitude, longitude, radius_meters, created_at, is_active, branch_id) FROM stdin;
3	Kho vận Cảng Tiên Sa	client_site	16.120760	108.214470	300	2026-03-19 08:39:12.006185+07	t	\N
2	Chi nhánh Đà Nẵng	branch	16.067780	108.220830	50	2026-03-19 08:39:12.006185+07	t	2
4	Đá Và Ong	branch	16.059377	108.174223	100	2026-03-21 14:00:05.585715+07	t	3
1	Trụ sở chính Hà Nội	branch	21.028511	105.804817	200	2026-03-19 08:39:12.006185+07	t	1
7	Nhà Khang	branch	16.031771	108.244364	100	2026-04-05 16:32:23.87592+07	t	8
8	Khu vực mới	branch	21.028511	105.804817	100	2026-04-05 16:39:23.342313+07	t	9
9	Khu vực mới	branch	0.000000	0.000000	100	2026-04-05 16:39:44.644356+07	t	10
10	EEEEEE	branch	16.059087	108.174150	100	2026-04-06 10:22:48.971565+07	t	11
\.


--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 221
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 21, true);


--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 223
-- Name: branch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branch_id_seq', 12, true);


--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 226
-- Name: department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.department_id_seq', 5, true);


--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 231
-- Name: location_assignment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_assignment_id_seq', 1, false);


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 234
-- Name: notification_recipient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_recipient_id_seq', 17, true);


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 238
-- Name: position_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.position_id_seq', 10, true);


--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 242
-- Name: work_location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_location_id_seq', 10, true);


--
-- TOC entry 5055 (class 2606 OID 26456)
-- Name: attendance attendance_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- TOC entry 5057 (class 2606 OID 26458)
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- TOC entry 5061 (class 2606 OID 26460)
-- Name: branch branch_branch_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_branch_code_key UNIQUE (branch_code);


--
-- TOC entry 5063 (class 2606 OID 26462)
-- Name: branch branch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_pkey PRIMARY KEY (id);


--
-- TOC entry 5065 (class 2606 OID 26464)
-- Name: contract contract_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract
    ADD CONSTRAINT contract_contract_number_key UNIQUE (contract_number);


--
-- TOC entry 5067 (class 2606 OID 26466)
-- Name: contract contract_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract
    ADD CONSTRAINT contract_pkey PRIMARY KEY (id);


--
-- TOC entry 5069 (class 2606 OID 26468)
-- Name: department department_department_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_department_code_key UNIQUE (department_code);


--
-- TOC entry 5071 (class 2606 OID 26470)
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (id);


--
-- TOC entry 5073 (class 2606 OID 26472)
-- Name: employee employee_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_employee_code_key UNIQUE (employee_code);


--
-- TOC entry 5075 (class 2606 OID 26474)
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 26476)
-- Name: employee employee_work_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_work_email_key UNIQUE (work_email);


--
-- TOC entry 5080 (class 2606 OID 26478)
-- Name: hr_decision hr_decision_decision_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hr_decision
    ADD CONSTRAINT hr_decision_decision_number_key UNIQUE (decision_number);


--
-- TOC entry 5082 (class 2606 OID 26480)
-- Name: hr_decision hr_decision_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hr_decision
    ADD CONSTRAINT hr_decision_pkey PRIMARY KEY (id);


--
-- TOC entry 5086 (class 2606 OID 26482)
-- Name: leave_request leave_request_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_request
    ADD CONSTRAINT leave_request_pkey PRIMARY KEY (id);


--
-- TOC entry 5089 (class 2606 OID 26484)
-- Name: location_assignment location_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_assignment
    ADD CONSTRAINT location_assignment_pkey PRIMARY KEY (id);


--
-- TOC entry 5091 (class 2606 OID 26486)
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- TOC entry 5094 (class 2606 OID 26488)
-- Name: notification_recipient notification_recipient_notification_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipient
    ADD CONSTRAINT notification_recipient_notification_id_employee_id_key UNIQUE (notification_id, employee_id);


--
-- TOC entry 5096 (class 2606 OID 26490)
-- Name: notification_recipient notification_recipient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipient
    ADD CONSTRAINT notification_recipient_pkey PRIMARY KEY (id);


--
-- TOC entry 5099 (class 2606 OID 26492)
-- Name: overtime_request overtime_request_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.overtime_request
    ADD CONSTRAINT overtime_request_pkey PRIMARY KEY (id);


--
-- TOC entry 5102 (class 2606 OID 26494)
-- Name: payroll payroll_employee_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_employee_id_month_year_key UNIQUE (employee_id, month_year);


--
-- TOC entry 5104 (class 2606 OID 26496)
-- Name: payroll payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);


--
-- TOC entry 5106 (class 2606 OID 26498)
-- Name: position position_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."position"
    ADD CONSTRAINT position_pkey PRIMARY KEY (id);


--
-- TOC entry 5108 (class 2606 OID 26500)
-- Name: position position_position_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."position"
    ADD CONSTRAINT position_position_code_key UNIQUE (position_code);


--
-- TOC entry 5110 (class 2606 OID 26502)
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (config_key);


--
-- TOC entry 5112 (class 2606 OID 26504)
-- Name: user_account user_account_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_employee_id_key UNIQUE (employee_id);


--
-- TOC entry 5114 (class 2606 OID 26506)
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);


--
-- TOC entry 5116 (class 2606 OID 26508)
-- Name: user_account user_account_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_username_key UNIQUE (username);


--
-- TOC entry 5118 (class 2606 OID 26510)
-- Name: work_location work_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_location
    ADD CONSTRAINT work_location_pkey PRIMARY KEY (id);


--
-- TOC entry 5058 (class 1259 OID 26511)
-- Name: idx_att_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_att_date ON public.attendance USING btree (attendance_date);


--
-- TOC entry 5059 (class 1259 OID 26512)
-- Name: idx_att_payroll; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_att_payroll ON public.attendance USING btree (payroll_id);


--
-- TOC entry 5083 (class 1259 OID 26513)
-- Name: idx_decision_issuer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_decision_issuer ON public.hr_decision USING btree (issuer_id);


--
-- TOC entry 5084 (class 1259 OID 26514)
-- Name: idx_decision_payroll; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_decision_payroll ON public.hr_decision USING btree (payroll_id);


--
-- TOC entry 5078 (class 1259 OID 26515)
-- Name: idx_emp_work_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_work_email ON public.employee USING btree (work_email);


--
-- TOC entry 5087 (class 1259 OID 26516)
-- Name: idx_loc_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loc_assignment ON public.location_assignment USING btree (employee_id, assigned_date);


--
-- TOC entry 5092 (class 1259 OID 26517)
-- Name: idx_notif_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_unread ON public.notification_recipient USING btree (employee_id) WHERE (is_read = false);


--
-- TOC entry 5097 (class 1259 OID 26518)
-- Name: idx_ot_payroll; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ot_payroll ON public.overtime_request USING btree (payroll_id);


--
-- TOC entry 5100 (class 1259 OID 26519)
-- Name: idx_payroll_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payroll_period ON public.payroll USING btree (month_year);


--
-- TOC entry 5119 (class 2606 OID 26520)
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5120 (class 2606 OID 26525)
-- Name: attendance attendance_payroll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES public.payroll(id) ON DELETE SET NULL;


--
-- TOC entry 5121 (class 2606 OID 26530)
-- Name: attendance attendance_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_location(id) ON DELETE SET NULL;


--
-- TOC entry 5122 (class 2606 OID 26535)
-- Name: contract contract_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract
    ADD CONSTRAINT contract_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5123 (class 2606 OID 26540)
-- Name: department department_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id) ON DELETE SET NULL;


--
-- TOC entry 5125 (class 2606 OID 26545)
-- Name: employee employee_direct_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_direct_manager_id_fkey FOREIGN KEY (direct_manager_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- TOC entry 5126 (class 2606 OID 26550)
-- Name: employee employee_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_position_id_fkey FOREIGN KEY (position_id) REFERENCES public."position"(id) ON DELETE SET NULL;


--
-- TOC entry 5124 (class 2606 OID 26555)
-- Name: department fk_dept_manager; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- TOC entry 5127 (class 2606 OID 26560)
-- Name: hr_decision hr_decision_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hr_decision
    ADD CONSTRAINT hr_decision_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5128 (class 2606 OID 26565)
-- Name: hr_decision hr_decision_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hr_decision
    ADD CONSTRAINT hr_decision_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- TOC entry 5129 (class 2606 OID 26570)
-- Name: hr_decision hr_decision_payroll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hr_decision
    ADD CONSTRAINT hr_decision_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES public.payroll(id) ON DELETE SET NULL;


--
-- TOC entry 5130 (class 2606 OID 26575)
-- Name: leave_request leave_request_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_request
    ADD CONSTRAINT leave_request_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5131 (class 2606 OID 26580)
-- Name: leave_request leave_request_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_request
    ADD CONSTRAINT leave_request_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5132 (class 2606 OID 26658)
-- Name: location_assignment location_assignment_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_assignment
    ADD CONSTRAINT location_assignment_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id) ON DELETE CASCADE;


--
-- TOC entry 5133 (class 2606 OID 26663)
-- Name: location_assignment location_assignment_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_assignment
    ADD CONSTRAINT location_assignment_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.department(id) ON DELETE CASCADE;


--
-- TOC entry 5134 (class 2606 OID 26585)
-- Name: location_assignment location_assignment_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_assignment
    ADD CONSTRAINT location_assignment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE CASCADE;


--
-- TOC entry 5135 (class 2606 OID 26590)
-- Name: location_assignment location_assignment_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_assignment
    ADD CONSTRAINT location_assignment_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_location(id) ON DELETE CASCADE;


--
-- TOC entry 5139 (class 2606 OID 26595)
-- Name: notification_recipient notification_recipient_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipient
    ADD CONSTRAINT notification_recipient_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE CASCADE;


--
-- TOC entry 5140 (class 2606 OID 26600)
-- Name: notification_recipient notification_recipient_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipient
    ADD CONSTRAINT notification_recipient_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notification(id) ON DELETE CASCADE;


--
-- TOC entry 5136 (class 2606 OID 26605)
-- Name: notification notification_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- TOC entry 5137 (class 2606 OID 26610)
-- Name: notification notification_target_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_target_department_id_fkey FOREIGN KEY (target_department_id) REFERENCES public.department(id) ON DELETE SET NULL;


--
-- TOC entry 5138 (class 2606 OID 26615)
-- Name: notification notification_target_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_target_employee_id_fkey FOREIGN KEY (target_employee_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- TOC entry 5141 (class 2606 OID 26620)
-- Name: overtime_request overtime_request_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.overtime_request
    ADD CONSTRAINT overtime_request_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- TOC entry 5142 (class 2606 OID 26625)
-- Name: overtime_request overtime_request_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.overtime_request
    ADD CONSTRAINT overtime_request_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5143 (class 2606 OID 26630)
-- Name: overtime_request overtime_request_payroll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.overtime_request
    ADD CONSTRAINT overtime_request_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES public.payroll(id) ON DELETE SET NULL;


--
-- TOC entry 5144 (class 2606 OID 26635)
-- Name: payroll payroll_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE RESTRICT;


--
-- TOC entry 5145 (class 2606 OID 26640)
-- Name: position position_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."position"
    ADD CONSTRAINT position_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.department(id) ON DELETE CASCADE;


--
-- TOC entry 5146 (class 2606 OID 26645)
-- Name: user_account user_account_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE CASCADE;


--
-- TOC entry 5147 (class 2606 OID 26650)
-- Name: work_location work_location_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_location
    ADD CONSTRAINT work_location_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id) ON DELETE CASCADE;


-- Completed on 2026-04-10 08:51:39

--
-- PostgreSQL database dump complete
--

\unrestrict Xz65F9r2xMNBaQ3j7PSzmKGDyZW1YLr4xwJD7TSmjc7u94cPvyu7iTlTc1i0FJi

