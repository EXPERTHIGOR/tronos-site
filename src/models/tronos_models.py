from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class TronosUser(db.Model):
    __tablename__ = 'tronos_users'
    
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    whatsapp = db.Column(db.String(20), nullable=False)
    user_type = db.Column(db.String(20), nullable=False)  # 'agent', 'creator', 'admin'
    is_approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Campos específicos para agentes
    channel_name = db.Column(db.String(200))  # Nome do canal que edita/gerencia
    function = db.Column(db.String(100))  # Editor principal, Editor de cortes, etc.
    function_other = db.Column(db.String(200))  # Campo "Outro"
    represented_creator = db.Column(db.String(200))  # Criador representado
    registration_code = db.Column(db.String(100))
    
    # Campos específicos para criadores
    channel_description = db.Column(db.Text)  # Descrição do canal
    main_platforms = db.Column(db.String(500))  # Principais plataformas
    subscribers_count = db.Column(db.String(100))  # Número de inscritos/seguidores
    
    # Novos campos obrigatórios para criadores
    full_address = db.Column(db.Text)  # Endereço completo
    phone = db.Column(db.String(20))  # Telefone/WhatsApp adicional
    social_url = db.Column(db.String(500))  # URL da rede social
    country = db.Column(db.String(100))  # País de residência
    document_number = db.Column(db.String(50))  # CPF ou CNPJ
    
    # Declarações obrigatórias (checkboxes)
    declaration_1 = db.Column(db.Boolean, default=False)  # Titular legítimo
    declaration_2 = db.Column(db.Boolean, default=False)  # Autorização plataforma
    declaration_3 = db.Column(db.Boolean, default=False)  # Conhecimento leis
    declaration_4 = db.Column(db.Boolean, default=False)  # Ciência sanções
    declaration_5 = db.Column(db.Boolean, default=False)  # Autorização dados
    declaration_6 = db.Column(db.Boolean, default=False)  # Informações verdadeiras
    declaration_7 = db.Column(db.Boolean, default=False)  # Termos e política
    declaration_8 = db.Column(db.Boolean, default=False)  # Intermediário técnico
    declaration_9 = db.Column(db.Boolean, default=False)  # Responsabilidade disputa
    signature = db.Column(db.String(200))  # Assinatura (nome completo)
    
    # Relacionamentos
    removal_requests = db.relationship('RemovalRequest', backref='requester', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'login': self.login,
            'full_name': self.full_name,
            'email': self.email,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'whatsapp': self.whatsapp,
            'user_type': self.user_type,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat(),
            'channel_name': self.channel_name,
            'function': self.function,
            'function_other': self.function_other,
            'represented_creator': self.represented_creator,
            'registration_code': self.registration_code,
            'channel_description': self.channel_description,
            'main_platforms': self.main_platforms,
            'subscribers_count': self.subscribers_count,
            'full_address': self.full_address,
            'phone': self.phone,
            'social_url': self.social_url,
            'country': self.country,
            'document_number': self.document_number,
            'signature': self.signature
        }

class RemovalRequest(db.Model):
    __tablename__ = 'removal_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('tronos_users.id'), nullable=False)
    original_url = db.Column(db.String(500), nullable=False)
    original_title = db.Column(db.String(300), nullable=False)
    original_date = db.Column(db.Date, nullable=False)
    removal_url = db.Column(db.String(500), nullable=False)
    username = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    admin_notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'original_url': self.original_url,
            'original_title': self.original_title,
            'original_date': self.original_date.isoformat() if self.original_date else None,
            'removal_url': self.removal_url,
            'username': self.username,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'admin_notes': self.admin_notes,
            'requester_name': self.requester.full_name if self.requester else None
        }

class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    whatsapp = db.Column(db.String(20), nullable=False)
    video_url = db.Column(db.String(500), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'whatsapp': self.whatsapp,
            'video_url': self.video_url,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'is_read': self.is_read
        }

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('tronos_users.id'))
    action = db.Column(db.String(200), nullable=False)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat()
        }

