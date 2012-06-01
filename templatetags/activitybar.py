# -*- coding: utf-8 -*-
from django import template

register = template.Library()

@register.inclusion_tag('activitybar/activitybar.html')
def activitybar_timeline(id, bins):
    return { 'id': id, 'bins': bins }
