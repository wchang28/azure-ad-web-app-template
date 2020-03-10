CREATE TABLE [dbo].[sessions](
	[sid] [varchar](255) NOT NULL,
	[session] [varchar](max) NOT NULL,
	[expires] [datetime] NOT NULL,
	[user_id]  AS (json_value([session],'$.passport.user.id')),
	[user_name]  AS (json_value([session],'$.passport.user.name')),
	[token_type]  AS (json_value([session],'$.passport.user.token_type')),
	[access_token]  AS (json_value([session],'$.passport.user.access_token')),
	[refresh_token]  AS (json_value([session],'$.passport.user.refresh_token')),
	[session_expire_utc]  AS ([expires]),
	[session_expired]  AS (CONVERT([bit],case when getutcdate()>=[expires] then (1) else (0) end)),
	[session_expire_in_minute]  AS (datediff(minute,getutcdate(),[expires])),
	[token_expire_utc]  AS (CONVERT([datetime],json_value([session],'$.passport.user.token_expire_utc'))),
	[token_expired]  AS (CONVERT([bit],case when getutcdate()>=CONVERT([datetime],json_value([session],'$.passport.user.token_expire_utc')) then (1) else (0) end)),
	[token_expire_in_minute]  AS (datediff(minute,getutcdate(),CONVERT([datetime],json_value([session],'$.passport.user.token_expire_utc')))),
	[create_utc] [datetime] NOT NULL,
 CONSTRAINT [PK__sessions__DDDFDD362E100293] PRIMARY KEY CLUSTERED 
(
	[sid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[sessions] ADD  CONSTRAINT [DF_sessions_create_utc]  DEFAULT (getutcdate()) FOR [create_utc]
GO
